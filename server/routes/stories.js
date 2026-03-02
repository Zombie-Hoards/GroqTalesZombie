/**
 * Stories API Routes — Supabase
 * Handles story CRUD and AI generation via Supabase PostgreSQL
 */

const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authRequired } = require('../middleware/auth');

/**
 * @swagger
 * /api/v1/stories:
 *   get:
 *     tags:
 *       - Stories
 *     summary: Get stories list
 *     description: Returns a paginated list of stories with optional filtering by genre and author.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of stories per page.
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter stories by genre.
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter stories by author UUID.
 *     responses:
 *       200:
 *         description: Stories retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Internal server error.
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { genre, author } = req.query;

    let query = supabaseAdmin.from('stories').select('*, profiles!author_id(username, avatar_url, display_name)', { count: 'exact' });

    if (genre) query = query.eq('genre', genre);
    if (author) query = query.eq('author_id', author);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: stories, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      data: stories || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/stories/create:
 *   post:
 *     tags:
 *       - Stories
 *     summary: Create a new story
 *     description: Creates a new story in Supabase and returns the created story object.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - genre
 *             properties:
 *               title:
 *                 type: string
 *                 example: "The Last Algorithm"
 *               content:
 *                 type: string
 *                 example: "Once upon a time in a digital world..."
 *               genre:
 *                 type: string
 *                 enum: [fantasy, sci-fi, mystery, adventure, horror, romance, other]
 *                 example: sci-fi
 *     responses:
 *       201:
 *         description: Story created successfully.
 *       400:
 *         description: Missing required fields.
 *       500:
 *         description: Internal server error.
 */
router.post('/create', authRequired, async (req, res) => {
  try {
    const { title, content, genre, description, coverImage } = req.body;

    if (!title || !content || !genre || !description) {
      return res.status(400).json({ error: 'title, content, genre, and description are required' });
    }

    // Get author's display name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('username, display_name')
      .eq('id', req.user.id)
      .single();

    const { data: story, error } = await supabaseAdmin
      .from('stories')
      .insert({
        title,
        description,
        cover_image: coverImage || null,
        content,
        genre: genre.toLowerCase(),
        author_id: req.user.id,
        author_name: profile?.display_name || profile?.username || 'Anonymous',
      })
      .select()
      .single();

    if (error) {
      console.error('Story creation error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(story);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/stories/search/{id}:
 *   get:
 *     tags:
 *       - Stories
 *     summary: Get story by ID
 *     description: Returns a single story by its UUID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the story.
 *     responses:
 *       200:
 *         description: Story retrieved successfully.
 *       404:
 *         description: Story not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/search/:id', async (req, res) => {
  try {
    const { data: story, error } = await supabaseAdmin
      .from('stories')
      .select('*, profiles!author_id(username, avatar_url, display_name)')
      .eq('id', req.params.id)
      .single();

    if (error || !story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Increment view count
    await supabaseAdmin
      .from('stories')
      .update({ views: (story.views || 0) + 1 })
      .eq('id', req.params.id);

    return res.json(story);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/stories/generate:
 *   post:
 *     tags:
 *       - Stories
 *     summary: Generate story with AI
 *     description: Generates a story using AI based on the given prompt (placeholder).
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               genre:
 *                 type: string
 *               length:
 *                 type: string
 *               style:
 *                 type: string
 *     responses:
 *       200:
 *         description: Story generated successfully.
 *       500:
 *         description: Internal server error.
 */
router.post('/generate', authRequired, async (req, res) => {
  try {
    const { prompt, genre, length, style } = req.body;

    // Placeholder implementation
    const generatedStory = {
      id: require('crypto').randomUUID(),
      title: 'AI Generated Story',
      content: 'Generated story content based on prompt...',
      genre,
      metadata: { prompt, length, style, generatedAt: new Date().toISOString() },
    };

    return res.json(generatedStory);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/stories/{id}/analyze:
 *   post:
 *     tags:
 *       - Stories
 *     summary: Analyze story content
 *     description: Analyzes a story and returns sentiment, themes, and readability (placeholder).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Analysis completed.
 *       500:
 *         description: Internal server error.
 */
router.post('/:id/analyze', authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = {
      storyId: id,
      sentiment: 'positive',
      themes: ['adventure', 'friendship'],
      readabilityScore: 8.5,
      wordCount: 1500,
      analyzedAt: new Date().toISOString(),
    };

    return res.json(analysis);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;

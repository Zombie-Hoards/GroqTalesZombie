/**
 * Groq API Routes
 *
 * Endpoints consumed by the frontend use-groq.ts hook.
 * - GET  /api/groq/models  → available models + defaults
 * - POST /api/groq         → multiplexed action handler
 */

const express = require('express');
const router = express.Router();
const groqService = require('../services/groqService');

/**
 * @swagger
 * /api/groq/models:
 *   get:
 *     tags:
 *       - AI
 *     summary: List available Groq AI models
 *     description: Returns the set of Groq models available for content generation and analysis.
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [test]
 *         description: Set to "test" to run a connection test instead.
 *     responses:
 *       200:
 *         description: Model list or test result.
 */
router.get('/models', async (req, res) => {
    try {
        // Connection test mode
        if (req.query.action === 'test') {
            const apiKey = req.query.apiKey || undefined;
            const result = await groqService.testConnection(apiKey);
            return res.json(result);
        }

        // Return available models
        res.json({
            models: groqService.MODELS,
            modelNames: groqService.MODEL_DISPLAY_NAMES,
            default: groqService.MODELS.PRIMARY,
            tokenBudgets: groqService.TOKEN_BUDGETS,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/groq:
 *   post:
 *     tags:
 *       - AI
 *     summary: Groq AI action endpoint
 *     description: |
 *       Multiplexed AI endpoint. Set the `action` field to one of:
 *       `generate`, `analyze`, `ideas`, `improve`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [generate, analyze, ideas, improve]
 *               prompt:
 *                 type: string
 *               content:
 *                 type: string
 *               genre:
 *                 type: string
 *               theme:
 *                 type: string
 *               length:
 *                 type: string
 *                 enum: [short, medium, long]
 *               tone:
 *                 type: string
 *               characters:
 *                 type: string
 *               setting:
 *                 type: string
 *               formatType:
 *                 type: string
 *               model:
 *                 type: string
 *               focus:
 *                 type: string
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Action completed successfully.
 *       400:
 *         description: Invalid action or missing required fields.
 *       500:
 *         description: Internal server error.
 */
router.post('/', async (req, res) => {
    try {
        const { action, apiKey } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Missing required field: action' });
        }

        let result;

        switch (action) {
            case 'generate': {
                const { prompt, genre, theme, length, tone, characters, setting, formatType, model, options } = req.body;
                if (!prompt && !theme) {
                    return res.status(400).json({ error: 'Either prompt or theme is required for generation' });
                }
                result = await groqService.generate({
                    prompt,
                    genre,
                    theme,
                    length: length || options?.length,
                    tone,
                    characters,
                    setting,
                    formatType,
                    model: model || options?.model,
                    temperature: options?.temperature,
                    maxTokens: options?.max_tokens,
                    apiKey,
                });
                return res.json({ result: result.content, model: result.model, tokensUsed: result.tokensUsed });
            }

            case 'analyze': {
                const { content } = req.body;
                if (!content) {
                    return res.status(400).json({ error: 'content is required for analysis' });
                }
                result = await groqService.analyze({ content, apiKey });
                return res.json({ result: result.content, tokensUsed: result.tokensUsed });
            }

            case 'ideas': {
                const { genre, theme, count } = req.body;
                result = await groqService.generateIdeas({ genre, count: count || 5, theme, apiKey });
                return res.json({ result: result.content, tokensUsed: result.tokensUsed });
            }

            case 'improve': {
                const { content, focus } = req.body;
                if (!content) {
                    return res.status(400).json({ error: 'content is required for improvement' });
                }
                result = await groqService.improve({ content, focusArea: focus, apiKey });
                return res.json({ result: result.content, tokensUsed: result.tokensUsed });
            }

            default:
                return res.status(400).json({ error: `Unknown action: ${action}. Supported: generate, analyze, ideas, improve` });
        }
    } catch (error) {
        console.error('Groq route error:', error);
        res.status(500).json({ error: error.message || 'AI operation failed' });
    }
});

module.exports = router;

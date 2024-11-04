import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getQuestionsByDiscipline } from '@/lib/api/questions/get-questions-by-discipline';
import { RateLimiter } from '@/lib/api/rate-limit';
import { handleAndReturnErrorResponse } from '@/lib/api/errors';

const GetQuestionsResponseSchema = z.object({
    metadata: z.object({
        limit: z.number(),
        offset: z.number(),
        total: z.number(),
        hasMore: z.boolean(),
    }),
    questions: z.array(
        z.object({
            title: z.string(),
            index: z.number(),
            year: z.number(),
            discipline: z.string(),
            correctAlternative: z.string(),
            alternatives: z.array(
                z.object({
                    letter: z.string(),
                    text: z.string(),
                    isCorrect: z.boolean(),
                })
            ),
        })
    ),
});

const rateLimiter = new RateLimiter();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const discipline = searchParams.get('discipline');
    const limit = Number(searchParams.get('limit') ?? 20);
    const offset = Number(searchParams.get('offset') ?? 0);

    if (!discipline) {
        return NextResponse.json({ error: "Discipline is required" }, { status: 400 });
    }

    if (limit > 50) {
        return NextResponse.json({ error: "Limit cannot be greater than 50" }, { status: 400 });
    }

    const { rateLimitHeaders } = rateLimiter.check(req);

    try {
        const questions = await getQuestionsByDiscipline(discipline);

        const total = questions.length;
        const paginatedQuestions = questions.slice(offset, offset + limit);
        const hasMore = offset + limit < total;

        const responsePayload = GetQuestionsResponseSchema.parse({
            metadata: {
                limit,
                offset,
                total,
                hasMore,
            },
            questions: paginatedQuestions,
        });

        return NextResponse.json(responsePayload, { headers: rateLimitHeaders });
    } catch (error) {
        return handleAndReturnErrorResponse(error);
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsByDiscipline } from '@/lib/api/questions/get-questions-by-discipline';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const discipline = searchParams.get('discipline');

    if (!discipline) {
        return NextResponse.json({ error: "Discipline is required" }, { status: 400 });
    }

    try {
        const questions = await getQuestionsByDiscipline(discipline);
        return NextResponse.json(questions);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
}

import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const QuestionSchema = z.object({
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
});

type Question = z.infer<typeof QuestionSchema>;

export async function getQuestionsByDiscipline(discipline: string) {
    const baseDir = path.join(process.cwd(), 'public');
    const lowerCaseDiscipline = discipline.toLowerCase();
    const filteredQuestions: Question[] = [];

    try {
        await access(baseDir); // Check if base directory exists
    } catch {
        console.error(`Directory not found: ${baseDir}`);
        return [];
    }

    const yearDirs = await readdir(baseDir);

    const allQuestions = await Promise.all(
        yearDirs.map(async (yearDir) => {
            const questionsDir = path.join(baseDir, yearDir, 'questions');
            try {
                await access(questionsDir); // Check if questions directory exists
            } catch {
                console.warn(`Questions directory not found for year ${yearDir}: ${questionsDir}`);
                return [];
            }

            const questionSubDirs = await readdir(questionsDir);
            const questionsForYear = await Promise.all(
                questionSubDirs.map(async (questionSubDir) => {
                    const questionDirPath = path.join(questionsDir, questionSubDir);
                    try {
                        await access(questionDirPath); // Check if subdirectory exists
                    } catch {
                        console.warn(`Question subdirectory not found: ${questionDirPath}`);
                        return [];
                    }

                    const questionFiles = await readdir(questionDirPath);

                    const questionsInDir = await Promise.all(
                        questionFiles
                            .filter(file => file.endsWith('.json')) // Only process JSON files
                            .map(async (file) => {
                                const filePath = path.join(questionDirPath, file);
                                try {
                                    const questionData = await readFile(filePath, 'utf-8');
                                    const question = QuestionSchema.safeParse(JSON.parse(questionData));

                                    if (question.success && question.data.discipline.toLowerCase() === lowerCaseDiscipline) {
                                        return question.data;
                                    }
                                } catch (error) {
                                    console.error(`Error loading question from file: ${filePath}`, error);
                                }
                                return null;
                            })
                    );

                    return questionsInDir.filter((q) => q !== null) as Question[];
                })
            );

            return questionsForYear.flat();
        })
    );

    return allQuestions.flat();
}

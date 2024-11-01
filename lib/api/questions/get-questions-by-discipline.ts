import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
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

    if (!existsSync(baseDir)) {
        console.error(`Directory not found: ${baseDir}`);
        return [];
    }

    const yearDirs = await readdir(baseDir);
    const filteredQuestions: Question[] = [];

    // Filter discipline in lowercase to be case-insensitive
    const lowerCaseDiscipline = discipline.toLowerCase();

    const allPromises = yearDirs.map(async (yearDir) => {
        const questionsDir = path.join(baseDir, yearDir, 'questions');

        if (!existsSync(questionsDir)) {
            console.warn(`Questions directory not found for year ${yearDir}: ${questionsDir}`);
            return;
        }

        const questionSubDirs = await readdir(questionsDir);

        // Process each subdirectory concurrently
        const subDirPromises = questionSubDirs.map(async (questionSubDir) => {
            const questionDirPath = path.join(questionsDir, questionSubDir);

            if (!existsSync(questionDirPath)) {
                console.warn(`Question subdirectory not found: ${questionDirPath}`);
                return;
            }

            const questionFiles = await readdir(questionDirPath);

            // Process each file concurrently
            const filePromises = questionFiles.map(async (file) => {
                const filePath = path.join(questionDirPath, file);

                try {
                    const questionData = await readFile(filePath, 'utf-8');
                    const question = QuestionSchema.safeParse(JSON.parse(questionData));

                    // Case-insensitive discipline match
                    if (question.success && question.data.discipline.toLowerCase() === lowerCaseDiscipline) {
                        filteredQuestions.push(question.data);
                    }
                } catch (error) {
                    console.error(`Error loading question from file: ${filePath}`, error);
                }
            });

            await Promise.all(filePromises); // Wait for all file reads in this subdir
        });

        await Promise.all(subDirPromises); // Wait for all subdir processing
    });

    await Promise.all(allPromises); // Wait for all year directory processing

    return filteredQuestions;
}

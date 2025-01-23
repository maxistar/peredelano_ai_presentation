const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const { createObjectCsvWriter } = require('csv-writer');
require('dotenv').config();


const openai = new OpenAI();

// Папка с PDF-файлами
const resumesDir = './resumes';
const outputCsv = './resumes.csv';

// Функция для обработки PDF-файлов
async function processPdfFile(filePath) {
  const fileData = fs.readFileSync(filePath);
  const pdfText = (await pdfParse(fileData)).text;
  //const prompt = `Извлеки следующую информацию из резюме:\n\n1. ФИО\n2. Профессия\n3. Количество лет опыта - целое число без дополнительных знаков\n4. Индустрия. Score - рейтинг кандидата: число от 1 до 100 равное годам опыта, где - score=1 - 1 лет опыта, score=25 - 25 лет опыта. \n\nПример ответа в формате JSON:\n{"ФИО":"Иванов Иван Иванович", "профессия":"software engineer", "годаОпыта":"10", "индустрия":"геймдев", "score":"1-100"} Markdown недопустим!\n\nТекст резюме:\n${pdfText}`;
  // const prompt = `Extract the name, title, years of experience, industry, and main technology from the CV text provided.
  const scoring = `\nScore - score of candidate: number from 1 to 100 equals to number of years of the professional experience where score=1 when 1 year of experience, score=25 - 25 years of experience.\n Example of output\n`

  // console.log(prompt)
      //  Score - рейтинг кандидата: число от 1 до 100 равное годам опыта, где - score=1 - 1 лет опыта, score=25 - 25 лет опыта.
// Score - score of candidate: number from 1 to 100 equal to number of years of the professional experience where score=1 when 1 year of experience, 10 - 10 year of experience, 25 - 25 years of experience.  
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {role: "system", content: prompt},
//        {role: 'user', content: pdfText},
      ],
      max_tokens: 200,
      temperature: 0,
    });
    console.log(response.choices[0].message.content);
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error(`Ошибка при обработке файла ${filePath}:`, error.message);
    return null;
  }
}

// Функция для обработки всех резюме
async function processAllResumes() {
  const files = fs.readdirSync(resumesDir).filter((file) => file.endsWith('.pdf'));

  const results = [];
  for (const file of files) {
    const filePath = path.join(resumesDir, file);
    console.log(`Processing ${file}...`);
    const data = await processPdfFile(filePath);
    if (data) {
      results.push({ file, ...data });
    }
  }

  // Сохранение результатов в CSV
  const csvWriter = createObjectCsvWriter({
    path: outputCsv,
    header: [
      { id: 'name', title: 'Name' },
      { id: 'title', title: 'Title' },
      { id: 'yearsOfExperience', title: 'Years of Experience' },
      { id: 'industry', title: 'Industry' },
      { id: 'mainTechnology', title: 'Main Technology' },
      { id: 'score', title: 'Score' },
    ],
  });

  await csvWriter.writeRecords(results);
  console.log(`Результаты сохранены в ${outputCsv}`);
}

// Запуск обработки
processAllResumes().catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error.message);
});

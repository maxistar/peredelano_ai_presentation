const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const { createObjectCsvWriter } = require('csv-writer');
require('dotenv').config();

// Настройка OpenAI API
//const configuration = new Configuration({
//  apiKey: process.env.OPENAI_API_KEY,
//});
const openai = new OpenAI();

// Папка с PDF-файлами
const resumesDir = './resumes';
const outputCsv = './resumes.csv';

// Функция для обработки PDF-файлов
async function processPdfFile(filePath) {
  const fileData = fs.readFileSync(filePath);
  const pdfText = (await pdfParse(fileData)).text;
  const prompt = `Извлеки следующую информацию из резюме:\n\n1. ФИО\n2. Профессия\n3. Количество лет опыта - целое число без дополнительных знаков\n4. Индустрия. Score - рейтинг кандидата: число от 1 до 100 равное годам опыта, где - score=1 - 1 лет опыта, score=25 - 25 лет опыта. \n\nПример ответа в формате JSON:\n{"ФИО":"Иванов Иван Иванович", "профессия":"software engineer", "годаОпыта":"10", "индустрия":"геймдев", "score":"1-100"} Markdown недопустим!\n\nТекст резюме:\n${pdfText}`;
  //console.log('prompt:', prompt);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {role: "system", content: prompt}
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
    console.log(`Обработка файла: ${file}`);
    const data = await processPdfFile(filePath);
    if (data) {
      results.push({ file, ...data });
    }
  }

  // Сохранение результатов в CSV
  const csvWriter = createObjectCsvWriter({
    path: outputCsv,
    header: [
      { id: 'file', title: 'File' },
      { id: 'ФИО', title: 'ФИО' },
      { id: 'профессия', title: 'Профессия' },
      { id: 'годаОпыта', title: 'Года Опыта' },
      { id: 'индустрия', title: 'Индустрия' },
      { id: 'score', title: 'Скор' },
    ],
  });

  await csvWriter.writeRecords(results);
  console.log(`Результаты сохранены в ${outputCsv}`);
}

// Запуск обработки
processAllResumes().catch((error) => {
  console.error('Ошибка при выполнении скрипта:', error.message);
});

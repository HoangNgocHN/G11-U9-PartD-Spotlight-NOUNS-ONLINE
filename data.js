/**
 * DATA.JS - Sentence Spotlight Game
 * ===================================
 * Nội dung nguyên văn từ slide Sentence Selection.
 * Unit 9 - Social Issues, Paragraph D (Concept Nouns).
 *
 * Mỗi object trong QUESTIONS gồm:
 *   - word:    từ vựng cần học
 *   - def:     định nghĩa tiếng Anh (hiện trong feedback để củng cố nghĩa)
 *   - correct: câu thể hiện ĐÚNG nghĩa từ (đáp án)
 *   - wrongs:  3 câu KHÔNG thể hiện nghĩa từ (đáp án nhiễu)
 */

const QUESTIONS = [
  {
    word: "sites",
    def: "places or pages on the internet (websites)",
    correct: "I visit many websites after school.",
    wrongs: [
      "I read books at school every day.",
      "I play football with my friends.",
      "I eat lunch in the kitchen."
    ]
  },
  {
    word: "entertainment",
    def: "things people do or watch to enjoy themselves",
    correct: "I watch funny videos at night.",
    wrongs: [
      "I do my homework after school.",
      "I clean my room every Sunday.",
      "I walk to school in the morning."
    ]
  },
  {
    word: "risks",
    def: "the chance that something bad may happen",
    correct: "This game can be dangerous sometimes.",
    wrongs: [
      "This game is safe for children.",
      "I play games with my brother.",
      "I like games after school."
    ]
  },
  {
    word: "body shaming",
    def: "saying unkind things about someone's body or look",
    correct: "He says, \"You are too fat.\"",
    wrongs: [
      "He says, \"You look very nice today.\"",
      "He says, \"You are good at maths.\"",
      "He says, \"You are my close friend.\""
    ]
  },
  {
    word: "cyberbullying",
    def: "being mean or hurting others on the internet",
    correct: "She sends mean messages online.",
    wrongs: [
      "She studies English on her computer.",
      "She watches videos with her friends.",
      "She sends photos to her teacher."
    ]
  },
  {
    word: "social media",
    def: "websites/apps where people share things online",
    correct: "I post photos on Facebook.",
    wrongs: [
      "I write notes in my notebook.",
      "I read books in the library.",
      "I play chess after school."
    ]
  },
  {
    word: "identities",
    def: "personal information that shows who you are",
    correct: "He shares his name and photo online.",
    wrongs: [
      "He eats lunch with his friends.",
      "He plays games after school.",
      "He reads a story before bed."
    ]
  },
  {
    word: "comments",
    def: "words people write under a post to share opinions",
    correct: "I write \"Nice photo!\" under the post.",
    wrongs: [
      "I take a photo of my friend.",
      "I watch a video after school.",
      "I send a picture to my teacher."
    ]
  },
  {
    word: "images",
    def: "pictures you see online or in real life",
    correct: "I see many pictures online.",
    wrongs: [
      "I write a long story today.",
      "I listen to music at home.",
      "I talk to my teacher in class."
    ]
  },
  {
    word: "influencers",
    def: "people many others follow on social media",
    correct: "Many people follow her online videos.",
    wrongs: [
      "She reads books in her room.",
      "She walks to school every day.",
      "She studies with her classmates."
    ]
  },
  {
    word: "clothes",
    def: "things people wear (shirts, pants, dresses, etc.)",
    correct: "I buy a new shirt today.",
    wrongs: [
      "I eat lunch at school today.",
      "I play games after class.",
      "I watch TV with my family."
    ]
  },
  {
    word: "society",
    def: "a large group of people who live together",
    correct: "People live together in a city.",
    wrongs: [
      "I sit alone in my room.",
      "I eat breakfast at home.",
      "I read books quietly at night."
    ]
  },
  {
    word: "harmful content",
    def: "videos or posts online that can hurt viewers",
    correct: "The video shows violence online.",
    wrongs: [
      "The video shows cute animals.",
      "The video shows cooking food.",
      "The video shows a school lesson."
    ]
  },
  {
    word: "social networks",
    def: "online places where people connect and chat",
    correct: "I chat with friends on Facebook.",
    wrongs: [
      "I read books in the library.",
      "I write homework at home.",
      "I draw pictures in art class."
    ]
  },
  {
    word: "essential role",
    def: "a very important part someone or something plays",
    correct: "Teachers are very important for students.",
    wrongs: [
      "Students play games after school.",
      "Parents cook dinner every day.",
      "Friends talk after class."
    ]
  },
  {
    word: "social media users",
    def: "people who use apps like Facebook, TikTok, Instagram",
    correct: "Many people use TikTok every day.",
    wrongs: [
      "Many people read books at home.",
      "Many people play sports outside.",
      "Many people eat lunch together."
    ]
  }
];

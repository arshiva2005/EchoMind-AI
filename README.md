# 🧠 EchoMind AI

## Your AI-Powered Emotional Wellness Companion

EchoMind AI is an AI-powered emotional wellness application designed to help users understand, express, and manage their emotions in a safe and supportive environment.

The platform combines conversational AI with productivity and self-reflection features, allowing users to have meaningful conversations, maintain a personal journal, track their moods, and improve focus.


## 🌐 Live Demo

**Application:** http://echomind-env.eba-eqwdgfhi.us-west-2.elasticbeanstalk.com/

## 🌟 Features

### 🤖 AI Emotional Companion
- Human-like AI conversations
- Emotion-aware responses
- Personalized emotional support
- Safe space to express thoughts and feelings

### 😊 Mood Tracker
- Log and monitor daily moods
- Track emotional patterns over time
- Build self-awareness through regular tracking

### 📖 Smart Journal
- Write and save personal journal entries
- Reflect on daily experiences
- Encourage healthy emotional expression

### 🎯 Focus Mode
- Stay productive with distraction-free focus sessions
- Improve concentration while working or studying

### 🎤 Voice Interaction
- Interact with the AI using voice input
- Hands-free communication experience

### 📊 Emotional Insights
- AI-assisted emotional analysis
- Personalized suggestions based on conversations
- Supportive guidance for self-improvement

## 🛠 Tech Stack

| Category | Technologies |
|----------|--------------|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Vite |
| Database | Supabase |
| AI | Groq API (Llama 3.3 70B Versatile) |
| Deployment | AWS Elastic Beanstalk, Docker |


## 📂 Project Structure

EchoMind-AI
│
├── server/
├── static/
│   ├── css/
│   ├── js/
│   └── assets/
├── scripts/
├── supabase/
├── Dockerfile
├── package.json
├── vite.config.js
└── README.md

## 🚀 Getting Started

### Clone the Repository

git clone https://github.com/arshiva2005/EchoMind-AI.git

### Navigate to the Project

cd EchoMind-AI

### Install Dependencies

npm install

### Configure Environment Variables

Create a `.env` file in the project root and add:

GROQ_API_KEY=YOUR_GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile

SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

### Run the Application

npm run dev

## 🏗 System Architecture

                 User
                   │
                   ▼
      Frontend (HTML/CSS/JavaScript)
                   │
                   ▼
        Node.js + Vite Backend
          │                 │
          ▼                 ▼
     Groq AI API       Supabase Database

## 💡 Future Enhancements

- Conversation memory
- Multiple AI personalities
- Personalized wellness plans
- Daily emotion reports
- Calendar integration
- Mobile application
- Multi-language support
- Advanced analytics dashboard

## 👩‍💻 Developer

**Arshiva Verma**

B.Tech Computer Science Engineering

Government College of Engineering & Technology, Jammu

GitHub: https://github.com/arshiva2005

## 🤝 Contributing

Contributions, suggestions, and feature requests are welcome.

Feel free to fork the repository and submit a pull request.

## ⭐ Support

If you found this project interesting or helpful, consider giving it a ⭐ on GitHub.

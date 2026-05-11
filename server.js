const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// 🌟 [수정] 모든 도메인에서의 요청을 허용하도록 CORS 설정을 강화합니다.
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());

// ==========================================
// 1. 설정 (2.5 Flash 고정 및 DB 주소)
// ==========================================
const apiKey = "AIzaSyBnq3YMSylce45oA1YAT7Xua8hIsAxA6Dw"; 
const dbURI = "mongodb+srv://hwroh:fk10151015@cluster0.fm49kop.mongodb.net/test?retryWrites=true&w=majority";

// MongoDB 연결 옵션
const connectionOptions = {
    serverSelectionTimeoutMS: 20000, // 연결 대기 시간을 20초로 늘림
    socketTimeoutMS: 45000,
    family: 4 
};

// MongoDB 연결 실행
mongoose.connect(dbURI, connectionOptions)
  .then(() => console.log('✅ MongoDB 연결 성공! (DB 저장 준비 완료)'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err.message));

// 데이터 모델 정의 (컬렉션 이름을 'profiles'로 강제 지정)
const Profile = mongoose.model('Profile', new mongoose.Schema({
    name: { type: String, required: true },
    age: String,
    role: String,
    mbti: String,
    personality: String,
    exp: String,
    awards: String,
    createdAt: { type: Date, default: Date.now }
}), 'profiles');

// 서버 상태 체크용
app.get('/', (req, res) => res.send('🚀 Gemini 2.5 Flash & DB 서버 가동 중!'));

// [API 1] 프로필 저장 (DB 저장 로직 강화)
app.post('/api/profiles', async (req, res) => {
    try {
        console.log("📥 프론트엔드로부터 수신된 데이터:", req.body);
        
        // 데이터가 비어있는지 확인
        if (!req.body.name) {
            return res.status(400).json({ message: "성함(name) 정보는 필수입니다." });
        }

        const newProfile = new Profile(req.body);
        const savedProfile = await newProfile.save();
        
        console.log("✅ DB 저장 완료:", savedProfile);
        res.status(201).json({ message: "성공적으로 저장되었습니다.", data: savedProfile });
    } catch (err) { 
        console.error("❌ DB 저장 에러 발생:", err.message);
        res.status(500).json({ message: "데이터 저장 실패", error: err.message }); 
    }
});

// [API 2] 제미나이 2.5 Flash 기반 팀 매칭
app.get('/api/match', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ message: "DB가 아직 연결되지 않았습니다." });
        }

        const allProfiles = await Profile.find();
        console.log(`🔍 현재 DB 내 프로필 개수: ${allProfiles.length}개`);

        if (allProfiles.length < 2) {
            return res.status(400).json({ message: `데이터가 부족합니다. (현재 ${allProfiles.length}개)` });
        }

        const participantInfo = allProfiles.map((p, i) => 
            `${i+1}. 이름: ${p.name}, 역할: ${p.role}, MBTI: ${p.mbti}, 강점: ${p.personality}, 경력: ${p.exp}`
        ).join('\n');

        const prompt = `너는 IT 프로젝트 팀 빌딩 전문가야. 아래 참가자 정보를 바탕으로 최적의 팀 구성을 제안하고 이유를 설명해줘.\n\n${participantInfo}`;

        // 🌟 사용자 요청: 2.5 Flash 버전 고정
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        console.log("🤖 Gemini 2.5 Flash 호출 중...");
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Gemini API 에러:", data);
            return res.status(response.status).json({ message: "AI 분석 실패", detail: data.error.message });
        }

        const aiText = data.candidates[0].content.parts[0].text;
        res.json({ aiAnalysis: aiText });

    } catch (err) {
        console.error("❌ 서버 에러:", err.message);
        res.status(500).json({ message: "서버 내부 에러: " + err.message });
    }
});

const PORT = process.env.PORT || 3000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 서버 가동 중 (Gemini 2.5 Flash)`);
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 1. 설정 (사용자 요청에 따라 2.5 버전 고정)
// ==========================================
const apiKey = "AIzaSyBnq3YMSylce45oA1YAT7Xua8hIsAxA6Dw"; 
const dbURI = "mongodb+srv://hwroh:fk10151015@cluster0.fm49kop.mongodb.net/test?retryWrites=true&w=majority";

// MongoDB 연결 실행
mongoose.connect(dbURI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4 
})
.then(() => console.log('✅ MongoDB 연결 성공!'))
.catch(err => console.error('❌ MongoDB 연결 실패:', err.message));

// 데이터 모델 정의
const Profile = mongoose.model('Profile', new mongoose.Schema({
    name: String, age: String, role: String, mbti: String, personality: String, exp: String, awards: String, createdAt: { type: Date, default: Date.now }
}), 'profiles');

app.get('/', (req, res) => res.send('🚀 Gemini 2.5 Flash 서버 가동 중!'));

// [API 1] 프로필 저장
app.post('/api/profiles', async (req, res) => {
    try {
        const newProfile = new Profile(req.body);
        await newProfile.save();
        res.status(201).json({ message: "성공적으로 저장되었습니다." });
    } catch (err) { res.status(500).json({ message: "저장 실패: " + err.message }); }
});

// [API 2] 제미나이 2.5 Flash 기반 팀 매칭
app.get('/api/match', async (req, res) => {
    try {
        const allProfiles = await Profile.find();
        if (allProfiles.length < 2) {
            return res.status(400).json({ message: `참가자가 부족합니다. (현재 ${allProfiles.length}명)` });
        }

        const participantInfo = allProfiles.map((p, i) => 
            `${i+1}. 이름: ${p.name}, 역할: ${p.role}, MBTI: ${p.mbti}, 강점: ${p.personality}, 경력: ${p.exp}`
        ).join('\n');

        const prompt = `너는 IT 프로젝트 팀 빌딩 전문가야. 아래 참가자 정보를 바탕으로 최적의 팀 구성을 제안하고 이유를 설명해줘.\n\n${participantInfo}`;

        // 🌟 [중요] Gemini 2.5 Flash를 호출하는 가장 정확한 API 경로입니다.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // 2.5 버전에서 발생할 수 있는 구조적 에러를 잡습니다.
        if (!response.ok) {
            return res.status(response.status).json({ 
                message: "Gemini 2.5 API 응답 오류", 
                detail: data.error ? data.error.message : "지원되지 않는 모델명일 수 있습니다."
            });
        }

        if (data.candidates && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            res.json({ aiAnalysis: aiText });
        } else {
            res.status(500).json({ message: "AI 분석 결과 구조 오류", detail: data });
        }

    } catch (err) {
        res.status(500).json({ message: "서버 내부 에러: " + err.message });
    }
});

const PORT = process.env.PORT || 3000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 서버 가동 중 (Gemini 2.5 Flash 버전)`);
});
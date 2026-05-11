const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 1. 설정 (새로 발급받은 API 키를 꼭 넣으세요)
// ==========================================
const apiKey = "AIzaSyA0dOv3mXbk0CA5n1VEjnYRDZXYUFVXem8"; 
const dbURI = "mongodb://hwroh:fk10151015@ac-ouxew3k-shard-00-00.fm49kop.mongodb.net:27017,ac-ouxew3k-shard-00-01.fm49kop.mongodb.net:27017,ac-ouxew3k-shard-00-02.fm49kop.mongodb.net:27017/?ssl=true&replicaSet=atlas-1q9noo-shard-0&authSource=admin&appName=Cluster0";

// MongoDB 연결
mongoose.connect(dbURI)
  .then(() => console.log('✅ MongoDB 연결 성공!'))
  .catch(err => console.error('❌ MongoDB 연결 실패:', err));

// 데이터 모델 정의
const Profile = mongoose.model('Profile', new mongoose.Schema({
    name: String, age: String, role: String, mbti: String, personality: String, exp: String, awards: String, createdAt: { type: Date, default: Date.now }
}));

// [API 1] 프로필 저장
app.post('/api/profiles', async (req, res) => {
    try {
        const newProfile = new Profile(req.body);
        await newProfile.save();
        res.status(201).send({ message: "성공적으로 저장되었습니다." });
    } catch (err) { res.status(500).send(err); }
});

// [API 2] 제미나이 AI 기반 팀 매칭 (Gemini 2.5 Flash 적용)
app.get('/api/match', async (req, res) => {
    try {
        console.log("🔍 [1/3] DB에서 데이터를 가져오는 중...");
        const allProfiles = await Profile.find();
        
        if (allProfiles.length < 2) {
            return res.status(400).send({ message: `데이터가 ${allProfiles.length}개뿐입니다. 2명 이상 등록하세요.` });
        }

        const participantInfo = allProfiles.map((p, i) => 
            `${i+1}. 이름: ${p.name}, 역할: ${p.role}, MBTI: ${p.mbti}, 강점: ${p.personality}, 경력: ${p.exp}`
        ).join('\n');

        const prompt = `너는 IT 프로젝트 팀 빌딩 전문가야. 아래 참가자 정보를 바탕으로 최적의 팀 구성을 제안하고 이유를 설명해줘.\n\n${participantInfo}`;

        console.log("🤖 [2/3] 제미나이 2.5 Flash 호출 중...");

        // 🌟 사용자님이 선택하신 gemini-2.5-flash 모델로 경로 수정
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Google API 에러 발생!");
            console.error(JSON.stringify(data, null, 2));
            return res.status(response.status).send({ 
                message: "AI 서버 응답 오류", 
                detail: data.error ? data.error.message : "알 수 없는 오류"
            });
        }

        if (data.candidates && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            console.log("✅ [3/3] AI 분석 완료!");
            res.send({ aiAnalysis: aiText });
        } else {
            throw new Error("AI 응답 형식이 예상과 다릅니다.");
        }

    } catch (err) {
        console.error("❌ 서버 내부 에러:", err);
        res.status(500).send({ message: "서버 내부 에러 발생" });
    }
});

// Render가 제공하는 포트를 사용하거나 없으면 3000 사용
const PORT = process.env.PORT || 3000; 

// 0.0.0.0은 외부에서 오는 접속을 모두 허용하겠다는 뜻입니다.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 정상 작동 중입니다!`);
});
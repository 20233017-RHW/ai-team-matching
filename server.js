const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ==========================================
// 1. 설정 (API 키와 DB 주소 확인)
// ==========================================
const apiKey = "AIzaSyBnq3YMSylce45oA1YAT7Xua8hIsAxA6Dw"; 

// 사용자님이 요청하신 Standard Connection String 형식
// 비밀번호나 아이디에 특수문자가 있다면 에러가 날 수 있으니 주의하세요!
const dbURI = "mongodb+srv://hwroh:fk10151015@cluster0.fm49kop.mongodb.net/test?appName=Cluster0";

// MongoDB 연결 옵션 (Standard URI일 때 더 중요함)
const connectionOptions = {
    serverSelectionTimeoutMS: 10000, // 10초 대기
    socketTimeoutMS: 45000,
    family: 4 // Render 환경에서 IPv4 우선 연결 (연결 속도 향상)
};

// MongoDB 연결 실행
mongoose.connect(dbURI, connectionOptions)
  .then(() => console.log('✅ MongoDB 연결 성공! (Standard URI)'))
  .catch(err => {
      console.error('❌ MongoDB 연결 실패 상세 이유:');
      console.error(err.message);
  });

// 데이터 모델 정의
const Profile = mongoose.model('Profile', new mongoose.Schema({
    name: String, age: String, role: String, mbti: String, personality: String, exp: String, awards: String, createdAt: { type: Date, default: Date.now }
}));

// 서버 상태 체크용 메인 페이지
app.get('/', (req, res) => res.send('🚀 서버 정상 작동 중!'));

// [API 1] 프로필 저장
app.post('/api/profiles', async (req, res) => {
    try {
        const newProfile = new Profile(req.body);
        await newProfile.save();
        res.status(201).send({ message: "성공적으로 저장되었습니다." });
    } catch (err) { res.status(500).send({ message: "데이터 저장 실패: " + err.message }); }
});

// [API 2] 제미나이 AI 기반 팀 매칭
app.get('/api/match', async (req, res) => {
    try {
        // 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ message: "DB 연결 대기 중입니다. 잠시 후 다시 시도하세요." });
        }

        const allProfiles = await Profile.find();
        if (allProfiles.length < 2) {
            return res.status(400).send({ message: `데이터가 부족합니다. (현재 ${allProfiles.length}개)` });
        }

        const participantInfo = allProfiles.map((p, i) => 
            `${i+1}. 이름: ${p.name}, 역할: ${p.role}, MBTI: ${p.mbti}, 강점: ${p.personality}, 경력: ${p.exp}`
        ).join('\n');

        const prompt = `너는 IT 프로젝트 팀 빌딩 전문가야. 아래 참가자 정보를 바탕으로 최적의 팀 구성을 제안하고 이유를 설명해줘.\n\n${participantInfo}`;

        // 모델 경로는 gemini-1.5-flash가 현재 가장 안정적입니다.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            res.send({ aiAnalysis: data.candidates[0].content.parts[0].text });
        } else {
            res.status(500).send({ message: "AI 분석 실패", detail: data });
        }

    } catch (err) {
        res.status(500).send({ message: "서비 내부 에러: " + err.message });
    }
});

// 포트 설정
const PORT = process.env.PORT || 3000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 서버 가동 중 (Port: ${PORT})`);
});
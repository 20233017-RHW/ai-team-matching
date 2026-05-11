const profileBtn = document.getElementById('profileBtn');
const chatModal = document.getElementById('chatModal');
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const matchBtn = document.getElementById('matchBtn');
const resultArea = document.getElementById('resultArea');

// 1. AI 질문 리스트
const questions = [
    "성함이 어떻게 되시나요?",
    "나이는 어떻게 되시나요?",
    "지망하시는 분야는 어디인가요? (프론트엔드/백엔드/디자인)",
    "MBTI가 어떻게 되시나요?",
    "본인의 성격 강점을 한 단어로 표현한다면?",
    "코딩 경력은 어느 정도 되시나요? (예: 신입, 1년, 3년 등)",
    "대회 참여나 프로젝트 경험이 있으신가요?"
];

let currentStep = 0;
let userProfile = {};

// 모달 열기
profileBtn.onclick = () => {
    chatModal.style.display = "block";
    currentStep = 0;
    userProfile = {};
    chatWindow.innerHTML = '<p class="ai-msg">안녕하세요! 최적의 팀을 위해 몇 가지 질문을 드릴게요.</p>';
    addMessage(questions[0], 'ai-msg');
};

// 입력창 엔터 이벤트
userInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && userInput.value.trim() !== "") {
        const answer = userInput.value;
        addMessage(answer, 'user-msg');
        userInput.value = "";

        // 데이터 임시 저장
        saveData(currentStep, answer);

        currentStep++;
        if (currentStep < questions.length) {
            setTimeout(() => addMessage(questions[currentStep], 'ai-msg'), 500);
        } else {
            // 모든 질문이 끝났을 때
            setTimeout(async () => {
                addMessage("정보를 분석하여 데이터베이스에 저장 중입니다...", 'ai-msg');
                await saveToDatabase(); // DB 저장 함수 호출
                addMessage("저장이 완료되었습니다! 이제 팀 매칭을 진행해 보세요.", 'ai-msg');
                setTimeout(() => chatModal.style.display = "none", 2000);
            }, 500);
        }
    }
});

// 메시지 화면 출력
function addMessage(text, className) {
    const msg = document.createElement('p');
    msg.innerText = text;
    msg.className = className;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 데이터 매핑
function saveData(step, answer) {
    const keys = ["name", "age", "role", "mbti", "personality", "exp", "awards"];
    userProfile[keys[step]] = answer;
}

// [핵심] 2. MongoDB 저장을 위한 백엔드 통신 (주소 재확인)
async function saveToDatabase() {
    try {
        const response = await fetch('http://localhost:3000/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile)
        });
        
        if (!response.ok) throw new Error('서버 저장 실패');
        
        const result = await response.json();
        console.log("✅ DB 저장 성공:", result);
    } catch (error) {
        console.error("❌ 데이터 저장 에러:", error);
        alert("서버 연결에 실패했습니다. server.js가 켜져 있는지 확인하세요.");
    }
}

// [핵심] 3. 팀 매칭 데이터 가져오기
matchBtn.onclick = async () => {
    resultArea.innerHTML = "<h3>AI가 최적의 팀원을 분석 중입니다... 🤖</h3>";

    try {
        const response = await fetch('http://localhost:3000/api/match');
        const data = await response.json();

        if (response.ok) {
            // AI가 보내준 분석 글을 화면에 출력 (Markdown의 ** 등을 제거하거나 처리하면 더 좋습니다)
            const formattedText = data.aiAnalysis.replace(/\n/g, '<br>');
            resultArea.innerHTML = `
                <div style="background: #f4f7f6; padding: 20px; border-radius: 15px; line-height: 1.6; color: #333;">
                    <h3 style="color: #2c3e50;">✨ AI 팀 빌딩 결과</h3>
                    <hr style="border: 0.5px solid #ccc; margin-bottom: 15px;">
                    <p>${formattedText}</p>
                </div>
            `;
        } else {
            // 서버에서 보낸 에러 메시지(예: 데이터 부족 등) 출력
            resultArea.innerHTML = `<p style='color: red; background: #ffebee; padding: 10px;'>⚠️ 오류: ${data.message}</p>`;
        }
    } catch (error) {
        console.error("❌ 매칭 에러:", error);
        resultArea.innerHTML = "<p style='color: red;'>서버와 통신할 수 없습니다. 터미널을 확인하세요.</p>";
    }
};
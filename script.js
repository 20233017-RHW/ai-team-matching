const profileBtn = document.getElementById('profileBtn');
const chatModal = document.getElementById('chatModal');
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const matchBtn = document.getElementById('matchBtn');
const resultArea = document.getElementById('resultArea');

// 🌟 [중요] Render에서 받은 주소로 꼭 바꿔주세요! (끝에 /는 빼고 입력)
const SERVER_URL = "https://ai-team-matching.onrender.com"; 

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

profileBtn.onclick = () => {
    chatModal.style.display = "block";
    currentStep = 0;
    userProfile = {};
    chatWindow.innerHTML = '<p class="ai-msg">안녕하세요! 최적의 팀을 위해 몇 가지 질문을 드릴게요.</p>';
    addMessage(questions[0], 'ai-msg');
};

userInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && userInput.value.trim() !== "") {
        const answer = userInput.value;
        addMessage(answer, 'user-msg');
        userInput.value = "";

        saveData(currentStep, answer);

        currentStep++;
        if (currentStep < questions.length) {
            setTimeout(() => addMessage(questions[currentStep], 'ai-msg'), 500);
        } else {
            setTimeout(async () => {
                addMessage("정보를 분석하여 데이터베이스에 저장 중입니다...", 'ai-msg');
                await saveToDatabase(); 
                addMessage("저장이 완료되었습니다! 이제 팀 매칭을 진행해 보세요.", 'ai-msg');
                setTimeout(() => chatModal.style.display = "none", 2000);
            }, 500);
        }
    }
});

function addMessage(text, className) {
    const msg = document.createElement('p');
    msg.innerText = text;
    msg.className = className;
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function saveData(step, answer) {
    const keys = ["name", "age", "role", "mbti", "personality", "exp", "awards"];
    userProfile[keys[step]] = answer;
}

// 1. 프로필 저장 (localhost -> SERVER_URL)
async function saveToDatabase() {
    try {
        const response = await fetch(`${SERVER_URL}/api/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile)
        });
        
        if (!response.ok) throw new Error('서버 저장 실패');
        const result = await response.json();
        console.log("✅ DB 저장 성공:", result);
    } catch (error) {
        console.error("❌ 데이터 저장 에러:", error);
        alert("서버 연결에 실패했습니다. Render 서버가 켜져 있는지 확인하세요.");
    }
}

// 2. 팀 매칭 (localhost -> SERVER_URL)
matchBtn.onclick = async () => {
    resultArea.innerHTML = "<h3>AI가 최적의 팀원을 분석 중입니다... 🤖</h3>";

    try {
        const response = await fetch(`${SERVER_URL}/api/match`);
        const data = await response.json();

        if (response.ok) {
            const formattedText = data.aiAnalysis.replace(/\n/g, '<br>');
            resultArea.innerHTML = `
                <div style="background: #f4f7f6; padding: 20px; border-radius: 15px; line-height: 1.6; color: #333; text-align: left;">
                    <h3 style="color: #2c3e50;">✨ AI 팀 빌딩 결과</h3>
                    <hr style="border: 0.5px solid #ccc; margin-bottom: 15px;">
                    <p>${formattedText}</p>
                </div>
            `;
        } else {
            resultArea.innerHTML = `<p style='color: red; background: #ffebee; padding: 10px;'>⚠️ 오류: ${data.message}</p>`;
        }
    } catch (error) {
        console.error("❌ 매칭 에러:", error);
        resultArea.innerHTML = "<p style='color: red;'>서버와 통신할 수 없습니다. Render 서버 상태를 확인하세요.</p>";
    }
};
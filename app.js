document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        currentStep: 0,
        leadData: {}
    };

    // --- DOM Elements ---
    const landingPage = document.getElementById('landing-page');
    const quizPage = document.getElementById('quiz-page');
    const videoPage = document.getElementById('video-page');
    const startBtn = document.getElementById('start-btn');
    const quizStepsContainer = document.getElementById('quiz-steps');
    const progressBar = document.getElementById('progress-bar');
    const videoHeadline = document.getElementById('video-headline');
    const videoIframe = document.getElementById('video-iframe');

    // --- Quiz Data ---
    const quizQuestions = [
        {
            id: 'firstName',
            type: 'input',
            inputType: 'text',
            question: 'מה השם שלך?',
            placeholder: 'הכנס/י את שמך המלא'
        },
        {
            id: 'experienceTag',
            type: 'choice',
            question: 'לפני שנתחיל, מה רמת הניסיון שלך בעולם השיווק והפרסום הדיגיטלי?',
            options: [
                { label: 'אין לי ניסיון בכלל, אני מתחיל מאפס מוחלט.', value: 'Beginner' },
                { label: 'יש לי רקע בסיסי/ניסיתי בעבר אבל לא הגעתי לתוצאות.', value: 'Beginner' },
                { label: 'אני כבר עוסק בתחום/מנהל קמפיינים ומחפש לשדרג לדולרים.', value: 'Experienced' }
            ]
        },
        {
            id: 'incomeGoal',
            type: 'choice',
            question: 'מה מושך אותך יותר?',
            options: [
                { label: '$1,000 - $3,000 (הכנסה צדדית נחמדה מהבית)', value: '$1k-$3k' },
                { label: '$5,000 - $10,000 (החלפת המשכורת הנוכחית שלי)', value: '$5k-$10k' },
                { label: '$10,000+ (בניית אימפריה דולרית וחופש כלכלי מלא)', value: '$10k+' }
            ]
        },
        {
            id: 'workspacePreference',
            type: 'choice',
            question: 'מה היית מעדיף/ה?',
            options: [
                { label: 'נוודות דיגיטלית - לעבוד מכל מקום בעולם', value: 'נוודות דיגיטלית' },
                { label: 'פינה קבועה - עבודה ממשרד או מהבית', value: 'פינה קבועה' }
            ]
        },
        {
            id: 'characterTrait',
            type: 'choice',
            question: 'מה מאפיין אותך יותר?',
            options: [
                { label: 'אני שונא/ת מסגרות ורוצה עצמאות וחופש פעולה', subtext: 'נפש יצירתית חופשית ויזמית', value: 'שונא מסגרות' },
                { label: 'אני אוהב/ת יציבות ומסגרות', subtext: 'נוח לי לעבוד עם בהירות וכללים ברורים', value: 'אוהב יציבות' }
            ]
        },
        {
            id: 'thinkerType',
            type: 'choice',
            question: 'מה אתה/את יותר?',
            options: [
                { label: 'אומן/ית ואוהב/ת את היצירה', subtext: 'יצירתי וחזותי', value: 'אומן' },
                { label: 'טכני/ת ומתחבר/ת למספרים', subtext: 'שיטתי ואנליטי', value: 'טכני' }
            ]
        },
        {
            id: 'weeklyTime',
            type: 'choice',
            question: 'כמה זמן יש לך בשבוע ללמוד תחום חדש?',
            options: [
                { label: 'שעה 1 בשבוע', value: '1 שעה' },
                { label: '2-3 שעות בשבוע', value: '2-3 שעות' },
                { label: '3-6 שעות בשבוע', value: '3-6 שעות' },
                { label: 'מעל 6 שעות בשבוע', value: '6+ שעות' }
            ]
        },
        {
            id: 'age',
            type: 'input',
            inputType: 'number',
            question: 'מה הגיל שלך?',
            placeholder: 'הכנס/י את גילך'
        },
        {
            id: 'email',
            type: 'input',
            inputType: 'email',
            question: 'מה המייל שלך?',
            placeholder: 'example@email.com'
        },
        {
            id: 'phone',
            type: 'input',
            inputType: 'tel',
            question: 'מה מספר הטלפון שלך?',
            placeholder: '05XXXXXXXX'
        }
    ];

    // --- Init ---
    initQuiz();

    startBtn.addEventListener('click', () => {
        switchView(landingPage, quizPage);
        renderStep(state.currentStep);
    });

    // --- Functions ---
    function switchView(from, to) {
        from.classList.remove('active');
        setTimeout(() => {
            to.classList.add('active');
        }, 300);
    }

    function updateProgress() {
        const progress = ((state.currentStep) / quizQuestions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    function initQuiz() {
        quizStepsContainer.innerHTML = '';
        quizQuestions.forEach((q, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = `quiz-step ${index === 0 ? 'active' : ''}`;
            stepEl.id = `step-${index}`;
            
            let contentHTML = `<h2 class="question-title">${q.question}</h2>`;
            
            if (q.type === 'input') {
                contentHTML += `
                    <div class="input-group">
                        <input type="${q.inputType}" id="input-${q.id}" class="input-field" placeholder="${q.placeholder}" dir="rtl" />
                        <div id="error-${q.id}" class="error-msg"></div>
                    </div>
                    <div class="navigation-btns">
                        <button class="nav-btn next-btn" onclick="window.handleNext()">הבא</button>
                        ${index > 0 ? `<button class="nav-btn prev-btn" onclick="window.handlePrev()">חזור</button>` : `<button class="nav-btn prev-btn" onclick="window.location.reload()">חזור</button>`}
                    </div>
                `;
                stepEl.innerHTML = contentHTML;
                quizStepsContainer.appendChild(stepEl);

                // Add enter key listener
                setTimeout(() => {
                    const inputEl = document.getElementById(`input-${q.id}`);
                    if(inputEl) {
                        inputEl.addEventListener('keypress', function (e) {
                            if (e.key === 'Enter') {
                                window.handleNext();
                            }
                        });
                    }
                }, 100);

            } else if (q.type === 'choice') {
                contentHTML += `<div class="options-container">`;
                q.options.forEach((opt, i) => {
                    contentHTML += `
                        <button class="option-btn" onclick="window.handleChoice('${q.id}', '${opt.value}')">
                            ${opt.label}
                            ${opt.subtext ? `<span class="subtext">${opt.subtext}</span>` : ''}
                        </button>
                    `;
                });
                contentHTML += `</div>`;
                
                contentHTML += `
                    <div class="navigation-btns" style="margin-top: 1rem; justify-content: flex-end;">
                         ${index > 0 ? `<button class="nav-btn prev-btn" onclick="window.handlePrev()">חזור</button>` : ''}
                    </div>
                `;

                stepEl.innerHTML = contentHTML;
                quizStepsContainer.appendChild(stepEl);
            }
        });
    }

    function renderStep(stepIndex) {
        document.querySelectorAll('.quiz-step').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById(`step-${stepIndex}`).classList.add('active');
        updateProgress();
        
        // Auto focus input if present
        const currentQ = quizQuestions[stepIndex];
        if (currentQ.type === 'input') {
            setTimeout(() => {
                const inputEl = document.getElementById(`input-${currentQ.id}`);
                if(inputEl) inputEl.focus();
            }, 50);
        }
    }

    window.handlePrev = () => {
        if (state.currentStep > 0) {
            state.currentStep--;
            renderStep(state.currentStep);
        }
    };

    window.handleNext = () => {
        const q = quizQuestions[state.currentStep];
        if (q.type === 'input') {
            const inputEl = document.getElementById(`input-${q.id}`);
            const errorEl = document.getElementById(`error-${q.id}`);
            const val = inputEl.value.trim();
            
            // Validation
            if (!val) {
                showError(errorEl, 'שדה זה הוא חובה');
                return;
            }
            
            if (q.id === 'phone') {
                const phoneRegex = /^05\d{8}$/;
                if (!phoneRegex.test(val)) {
                    showError(errorEl, 'אנא הזן מספר טלפון תקין (10 ספרות שמתחילות ב-05)');
                    return;
                }
            }

            if (q.id === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(val)) {
                    showError(errorEl, 'אנא הזן כתובת מייל תקינה');
                    return;
                }
            }

            errorEl.style.display = 'none';
            state.leadData[q.id] = val;
            proceedToNextStep();
        }
    };

    window.handleChoice = (questionId, value) => {
        state.leadData[questionId] = value;
        proceedToNextStep();
    };

    function showError(element, msg) {
        element.textContent = msg;
        element.style.display = 'block';
    }

    function proceedToNextStep() {
        if (state.currentStep < quizQuestions.length - 1) {
            state.currentStep++;
            renderStep(state.currentStep);
        } else {
            // Update progress to 100%
            progressBar.style.width = `100%`;
            submitQuiz();
        }
    }

    function submitQuiz() {
        // Show loading state on the container
        quizPage.style.opacity = '0.5';
        quizPage.style.pointerEvents = 'none';

        // 1. Initial Webhook
        const initialWebhook = 'https://hooks.zapier.com/hooks/catch/16015214/ujre7w1/';
        sendToZapier(initialWebhook, state.leadData);

        // 2. Logic for Routing
        const isBeginner = state.leadData.experienceTag === 'Beginner';
        
        let videoId, headlineTemplate, autoDataWebhook;

        if (isBeginner) {
            videoId = 'DkRAtTA39qY';
            headlineTemplate = '{firstName}, בוא נהיה כנים - ניסית כבר הכל...';
            autoDataWebhook = 'https://hooks.zapier.com/hooks/catch/16015214/ujsvqws/';
        } else {
            videoId = 'lNCtT3jhh2s';
            headlineTemplate = '{firstName}, כנראה שכבר נמאס לך מלקוחות ישראלים...';
            autoDataWebhook = 'https://hooks.zapier.com/hooks/catch/16015214/ujsvier/';
        }

        // Prepare Video Page
        const firstName = state.leadData.firstName || '';
        videoHeadline.textContent = headlineTemplate.replace('{firstName}', firstName);
        videoIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

        // Transition
        setTimeout(() => {
            quizPage.style.opacity = '1';
            quizPage.style.pointerEvents = 'auto';
            switchView(quizPage, videoPage);
            
            // Send secondary automated webhook upon landing on the page
            sendToZapier(autoDataWebhook, state.leadData);
        }, 500);
    }

    function sendToZapier(url, data) {
        fetch(url, {
            method: 'POST',
            body: JSON.stringify(data)
        }).catch(err => console.error('Webhook Error:', err));
    }
});

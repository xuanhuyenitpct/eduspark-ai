import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI, Modality, Chat, Type } from "@google/genai";
import { useApiKey } from '../context/ApiContext';
import { decode, decodeAudioData } from '../utils/audio';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type ActivityMode = 'menu' | 'practice';
type MenuTab = 'skills' | 'textbook';

interface Activity {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string; // Tailwind color class for bg (e.g., 'bg-orange-500')
    isVisual?: boolean;
    type?: 'skill' | 'textbook';
    externalUrl?: string; // Thêm thuộc tính hỗ trợ link ngoài
}

interface ScenarioConfig {
    title: string;
    initialMessage: string;
    systemInstruction: string;
}

const SKILL_ACTIVITIES: Activity[] = [
    { 
        id: 'visual', 
        title: 'Nhìn Hình Luyện Nói', 
        description: 'AI vẽ tình huống 3D, bạn mô tả và thảo luận.', 
        icon: '📸', 
        color: 'bg-pink-500' ,
        isVisual: true,
        type: 'skill'
    },
    { 
        id: 'grammar', 
        title: 'Thử Thách Ngữ Pháp', 
        description: 'AI đóng vai giáo viên khó tính, bắt lỗi từng câu.', 
        icon: '📝', 
        color: 'bg-yellow-500',
        type: 'skill'
    },
    { 
        id: 'restaurant', 
        title: 'Gọi Món Nhà Hàng', 
        description: 'Đóng vai thực khách và bồi bàn tại nhà hàng Âu.', 
        icon: '🍽️', 
        color: 'bg-orange-500',
        type: 'skill'
    },
    { 
        id: 'weekend', 
        title: 'Kế Hoạch Cuối Tuần', 
        description: 'Thảo luận với bạn bè về chuyến đi chơi sắp tới.', 
        icon: '⛺', 
        color: 'bg-emerald-500',
        type: 'skill'
    },
    { 
        id: 'interview', 
        title: 'Phỏng Vấn Xin Việc', 
        description: 'Luyện trả lời phỏng vấn chuyên nghiệp bằng tiếng Anh.', 
        icon: '💼', 
        color: 'bg-blue-600',
        type: 'skill'
    },
    { 
        id: 'general', 
        title: 'Gia Sư 1-kèm-1', 
        description: 'Trò chuyện tự do về mọi chủ đề bạn thích.', 
        icon: '🎓', 
        color: 'bg-indigo-600',
        type: 'skill'
    },
    {
        id: 'lets_study_ext',
        title: "Let's Study English",
        description: 'Kho tài liệu và bài tập bổ trợ trực tuyến mở rộng.',
        icon: '🌐',
        color: 'bg-teal-600',
        type: 'skill',
        externalUrl: 'https://letsstudyenglish.netlify.app/'
    }
];

const TEXTBOOK_DATA = {
    6: [
        { unit: 1, title: "Towns & Cities", desc: "Từ vựng về thành phố & địa điểm.", color: "bg-blue-500" },
        { unit: 2, title: "Days", desc: "Thói quen & Trạng từ tần suất.", color: "bg-rose-500" },
        { unit: 3, title: "Wild Life", desc: "So sánh hơn & So sánh nhất.", color: "bg-green-600" },
        { unit: 4, title: "Learning World", desc: "Thì Hiện tại tiếp diễn.", color: "bg-amber-500" },
        { unit: 5, title: "Food & Health", desc: "Từ vựng đồ ăn & Danh từ đếm được.", color: "bg-orange-500" },
        { unit: 6, title: "Sports", desc: "Trắc nghiệm từ vựng thể thao.", color: "bg-sky-500" },
        { unit: 7, title: "Growing Up", desc: "Quá khứ đơn (Was/Were).", color: "bg-purple-500" },
        { unit: 8, title: "Going Away", desc: "Tương lai gần (Be going to).", color: "bg-teal-500" },
    ],
    7: [
        { unit: 1, title: "My Time", desc: "Sở thích & Động từ chỉ sự thích.", color: "bg-indigo-500" },
        { unit: 2, title: "Communication", desc: "Thì HTTD & Present Simple.", color: "bg-pink-500" },
        { unit: 3, title: "The Past", desc: "Quá khứ đơn (Động từ quy tắc/bất quy tắc).", color: "bg-slate-600" },
        { unit: 4, title: "In The Picture", desc: "Quá khứ tiếp diễn.", color: "bg-yellow-600" },
        { unit: 5, title: "Achieving Goals", desc: "Tương lai đơn (Will/Won't).", color: "bg-blue-700" },
        { unit: 6, title: "Survival", desc: "Động từ sinh tồn (Memory).", color: "bg-emerald-600" },
        { unit: 7, title: "Music", desc: "Từ vựng âm nhạc & Câu so sánh.", color: "bg-fuchsia-600" },
        { unit: 8, title: "Travel", desc: "Luyện nghe từ vựng du lịch.", color: "bg-cyan-500" },
    ]
};

// Static Scenarios configuration
const STATIC_SCENARIOS: Record<string, ScenarioConfig> = {
    general: {
        title: "Trò chuyện Tự do",
        initialMessage: "Hello! I'm your AI tutor. How are you feeling today?",
        systemInstruction: "You are a friendly and patient English teacher. Your goal is to have a natural conversation. Keep responses concise (under 40 words) and encouraging."
    },
    restaurant: {
        title: "Gọi món tại Nhà hàng",
        initialMessage: "Good evening! Welcome to The Gemini Bistro. Here is the menu. Are you ready to order?",
        systemInstruction: "You are a polite waiter at a restaurant. The user is a customer. Take their order, ask about preferences (steak doneness, drinks), and respond naturally. Keep it concise."
    },
    weekend: {
        title: "Lên kế hoạch cuối tuần",
        initialMessage: "Hey! The weekend is almost here. Do you have any plans yet?",
        systemInstruction: "You are a friendly friend. Discuss weekend plans with the user. Suggest activities like movies, sports, or camping. Be enthusiastic."
    },
    grammar: {
        title: "Thử Thách Ngữ Pháp",
        initialMessage: "Welcome to Grammar Challenge! Tell me about your day, and I will strictly correct your sentences.",
        systemInstruction: "You are a strict but helpful grammar coach. Your goal is NOT just to chat, but to catch grammar errors. For every user message, if there is an error, point it out clearly and provide the corrected version. If it's perfect, say 'Perfect!'. Keep responses focused on grammar correction."
    },
    interview: {
        title: "Phỏng Vấn Xin Việc",
        initialMessage: "Hello. Thank you for coming in today. Can you please introduce yourself?",
        systemInstruction: "You are a professional hiring manager at a tech company. Conduct a job interview with the user. Ask standard interview questions (strengths, weaknesses, experience). Be professional and formal."
    }
};

interface EnglishPracticeAppProps {
    onExit?: () => void;
}

export const EnglishPracticeApp = ({ onExit }: EnglishPracticeAppProps) => {
    const { runWithApiKey, apiKey, handleError } = useApiKey();
    
    // App Mode State
    const [mode, setMode] = useState<ActivityMode>('menu');
    const [menuTab, setMenuTab] = useState<MenuTab>('skills');
    const [textbookGrade, setTextbookGrade] = useState<6 | 7>(6);
    
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

    // Config State - This replaces the global mutation hack
    const [activeConfig, setActiveConfig] = useState<ScenarioConfig | null>(null);

    // Chat State
    const [messages, setMessages] = useState<{id: number; sender: 'ai' | 'user'; text: string}[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [loadingAudioKey, setLoadingAudioKey] = useState<string | null>(null);

    // Visual Mode State
    const [isVisualMode, setIsVisualMode] = useState(false);
    const [visualTopic, setVisualTopic] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Smart Tools State
    const [grammarFeedback, setGrammarFeedback] = useState<string | null>(null);
    const [vocabList, setVocabList] = useState<{word: string, meaning: string}[] | null>(null);
    const [suggestions, setSuggestions] = useState<string[] | null>(null);
    const [isToolLoading, setIsToolLoading] = useState(false);

    const audioCache = useRef(new Map());
    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const chatSessionRef = useRef<Chat | null>(null);
    const chatEndRef = useRef<null | HTMLDivElement>(null);

    // Reset chat session when API key changes
    useEffect(() => {
        chatSessionRef.current = null;
    }, [apiKey]);

    const handleStartActivity = (activity: Activity) => {
        // Handle External Links first
        if (activity.externalUrl) {
            window.open(activity.externalUrl, '_blank');
            return;
        }

        setSelectedActivity(activity);
        setMode('practice');
        setIsVisualMode(!!activity.isVisual);
        setGeneratedImage(null);
        setVisualTopic('');
        resetTools();
        setInputText('');
        setMessages([]);
        chatSessionRef.current = null;
        setActiveConfig(null);

        if (!activity.isVisual) {
            let config: ScenarioConfig;

            if (activity.type === 'textbook') {
                // Dynamic config creation for Textbook mode
                config = {
                    title: activity.title,
                    initialMessage: `Chào em! Hôm nay chúng ta sẽ ôn tập Unit: **${activity.title}**\nChủ đề chính: ${activity.description}\n\nThầy sẽ đóng vai người nước ngoài để em luyện tập nhé. Em đã sẵn sàng chưa?`,
                    systemInstruction: `You are an engaging English tutor for Vietnamese students. 
                    CONTEXT: The student is studying Grade ${textbookGrade} Unit: ${activity.title}.
                    KEY FOCUS: ${activity.description}.
                    
                    TASK: 
                    1. Roleplay a natural conversation related to the Unit's topic.
                    2. Actively use vocabulary and grammar structures from this specific Unit.
                    3. If the student makes a mistake related to the Key Focus (e.g., wrong tense), gently correct them in English but provide a short Vietnamese explanation if needed.
                    4. Keep sentences simple and suitable for Grade ${textbookGrade} level.`
                };
            } else {
                // Load from static constants
                config = STATIC_SCENARIOS[activity.id] || STATIC_SCENARIOS['general'];
            }

            // SET THE STATE
            setActiveConfig(config);

            const initialMsg = {
                id: Date.now(),
                sender: 'ai' as const,
                text: config.initialMessage,
            };

            setMessages([initialMsg]);
            
            runWithApiKey(() => playAudio(config.initialMessage, `init-${Date.now()}`));
        }
    };

    const handleBackToMenu = () => {
        // Instant exit without confirmation dialog to avoid blocking
        setMode('menu');
        setSelectedActivity(null);
        resetTools();
        chatSessionRef.current = null;
    };

    const resetTools = () => {
        setGrammarFeedback(null);
        setVocabList(null);
        setSuggestions(null);
    };
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, grammarFeedback, vocabList, suggestions]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                const speechToText = event.results[0][0].transcript;
                setInputText(speechToText);
            };
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsRecording(false);
            };
            recognition.onend = () => {
                setIsRecording(false);
            };
            recognitionRef.current = recognition;
        }
    }, []);

    const playAudio = async (textToPlay: string, audioKey: string) => {
        if (!textToPlay || loadingAudioKey === audioKey) return;

        // Strip Markdown for TTS (e.g., **Title** -> Title)
        const cleanText = textToPlay.replace(/\*\*/g, '').replace(/[\#\-\_]/g, '');

        if (audioCache.current.has(cleanText)) {
            const buffer = audioCache.current.get(cleanText);
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.start(0);
            return;
        }
        
        setLoadingAudioKey(audioKey);
        try {
            if (!apiKey) throw new Error("API Key is not set.");
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: cleanText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
                audioCache.current.set(cleanText, audioBuffer);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.start(0);
            }
        } catch (error) {
            console.error("Error generating or playing audio:", error);
            handleError(error);
        } finally {
            setLoadingAudioKey(null);
        }
    };

    const generateVisualScenario = async () => {
        if (!visualTopic.trim()) return;
        setIsGeneratingImage(true);
        setMessages([]);
        resetTools();

        try {
            if (!apiKey) throw new Error("API Key is not set.");
            const ai = new GoogleGenAI({ apiKey });
            
            // 1. Generate Image
            const imagePrompt = `Tạo một hình ảnh 3D, phong cách hoạt hình Pixar, mô tả tình huống: "${visualTopic}". Hình ảnh cần tươi sáng, phù hợp cho việc học tiếng Anh.`;
            
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const imagePart = imageResponse?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            
            if (!imagePart?.inlineData) {
                throw new Error("Không thể tạo hình ảnh. Vui lòng thử chủ đề khác.");
            }

            const base64Image = imagePart.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64Image}`);

            // 2. Initialize Chat with Image context
            const systemInstruction = `You are a friendly English tutor. The user has provided an image of a situation described as: "${visualTopic}". 
            Your goal is to roleplay or discuss this specific image with the student. 
            Start by describing what you see in the image briefly and asking the student a relevant question to start the conversation.
            Keep your responses concise (under 50 words) and encouraging. Correct major grammar mistakes gently.`;

            // Config for Visual Mode is set here dynamically
            setActiveConfig({
                title: "Nhìn Hình Luyện Nói",
                initialMessage: "Creating scenario...", // Placeholder, will be replaced by AI response
                systemInstruction: systemInstruction
            });

            chatSessionRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: 'image/png', data: base64Image } },
                            { text: "Let's practice English based on this image I generated." }
                        ]
                    }
                ],
                config: { systemInstruction }
            });

            // 3. Get initial message from AI
            const response = await chatSessionRef.current.sendMessage({ message: "Start the conversation now." });
            
            const initialAiMsg: {id: number; sender: 'user' | 'ai'; text: string} = {
                id: Date.now(),
                sender: 'ai',
                text: response.text,
            };
            setMessages([initialAiMsg]);
            runWithApiKey(() => playAudio(response.text, `main-${initialAiMsg.id}`));

        } catch (error) {
            console.error("Error generating visual scenario:", error);
            if (handleError(error)) return;
            alert("Không thể tạo tình huống. Lỗi: " + (error as Error).message);
        } finally {
            setIsGeneratingImage(false);
        }
    };
    
    const sendMessage = async (text: string) => {
        const messageText = text.trim();
        if (!messageText) return;

        setInputText('');
        setIsLoading(true);
        resetTools();

        const newUserMessage: {id: number; sender: 'user' | 'ai'; text: string} = {
            id: Date.now(),
            sender: 'user',
            text: messageText,
        };
        setMessages(prev => [...prev, newUserMessage]);
        
        try {
            if (!apiKey) throw new Error("API Key is not set.");
            const ai = new GoogleGenAI({ apiKey });
            
            if (!chatSessionRef.current) {
                // Initialize session using the Active Config State
                const instruction = activeConfig?.systemInstruction || "You are a helpful tutor.";
                const initialMsg = activeConfig?.initialMessage || "Hello!";

                const history = [{
                    role: 'model' as const,
                    parts: [{ text: initialMsg }]
                }];

                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    history: history,
                    config: {
                        systemInstruction: instruction,
                    }
                });
            }

            const response = await chatSessionRef.current.sendMessage({ message: messageText });

            const newAiMessage: {id: number; sender: 'user' | 'ai'; text: string} = {
                id: Date.now() + 1,
                sender: 'ai',
                text: response.text,
            };
            setMessages(prev => [...prev, newAiMessage]);
            runWithApiKey(() => playAudio(newAiMessage.text, `main-${newAiMessage.id}`));

        } catch (error) {
            console.error("Error with Gemini API:", error);
            if (handleError(error)) return;
            
            const errorAiMessage: {id: number; sender: 'user' | 'ai'; text: string} = {
                id: Date.now() + 1,
                sender: 'ai',
                text: "I'm sorry, I encountered an error. Please try again.",
            };
            setMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Smart Tools Functions ---

    const checkGrammar = async () => {
        const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
        if (!lastUserMsg) return;

        setIsToolLoading(true);
        try {
            if (!apiKey) throw new Error("API Key is not set.");
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Kiểm tra ngữ pháp câu tiếng Anh sau của học sinh: "${lastUserMsg.text}". 
            Nếu có lỗi, hãy chỉ ra lỗi và sửa lại kèm giải thích ngắn gọn bằng tiếng Việt. 
            Nếu câu đúng và tự nhiên, hãy khen ngợi.
            Giữ phản hồi ngắn gọn dưới 50 từ.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setGrammarFeedback(response.text);
        } catch (err) { handleError(err); } 
        finally { setIsToolLoading(false); }
    };

    const getVocabSuggestions = async () => {
        setIsToolLoading(true);
        try {
            if (!apiKey) throw new Error("API Key is not set.");
            const ai = new GoogleGenAI({ apiKey });
            const context = isVisualMode 
                ? `tình huống trong hình ảnh: "${visualTopic}"` 
                : `chủ đề "${selectedActivity?.title} - ${selectedActivity?.description}"`;
            
            const prompt = `Hãy liệt kê 4 từ vựng hoặc cụm từ tiếng Anh hay (kèm nghĩa tiếng Việt) liên quan đến ${context} mà học sinh nên dùng trong cuộc hội thoại này.
            Trả về dưới dạng JSON array: [{ "word": "example", "meaning": "ví dụ" }]`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                word: { type: Type.STRING },
                                meaning: { type: Type.STRING },
                            },
                            required: ['word', 'meaning']
                        }
                    }
                }
            });
            
            const data = JSON.parse(response.text);
            setVocabList(data);
        } catch (err) { handleError(err); }
        finally { setIsToolLoading(false); }
    };

    const getReplySuggestions = async () => {
        setIsToolLoading(true);
        try {
            if (!apiKey) throw new Error("API Key is not set.");
            const ai = new GoogleGenAI({ apiKey });
            const lastAiMsg = [...messages].reverse().find(m => m.sender === 'ai');
            const prompt = `AI vừa nói: "${lastAiMsg?.text || activeConfig?.initialMessage || 'Hello'}". 
            Hãy gợi ý 3 cách trả lời ngắn gọn, tự nhiên bằng tiếng Anh cho học sinh.
            Trả về dạng JSON array: ["Suggestion 1", "Suggestion 2", "Suggestion 3"]`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            
            const data = JSON.parse(response.text);
            setSuggestions(data);
        } catch (err) { handleError(err); }
        finally { setIsToolLoading(false); }
    };

    const handleMicClick = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setInputText('');
            recognitionRef.current.start();
        }
        setIsRecording(!isRecording);
    };

    // --- Render: Menu Mode ---
    if (mode === 'menu') {
        return (
            <section className="backdrop-blur-xl bg-white/10 border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-6xl mx-auto h-full flex flex-col overflow-hidden">
                <header className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div></div> {/* Spacer */}
                    <div className="text-center">
                         <h1 className="text-4xl md:text-5xl font-extrabold drop-shadow-sm text-white mb-2">Học Tiếng Anh Thông Minh</h1>
                         <p className="opacity-80 text-lg">Chọn chế độ luyện tập phù hợp với bạn</p>
                    </div>
                    {onExit && (
                        <button onClick={onExit} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-200 border border-white/10 text-sm font-semibold transition">
                            Thoát ra Dashboard
                        </button>
                    )}
                </header>

                {/* Tab Switcher */}
                <div className="flex justify-center mb-8 flex-shrink-0">
                    <div className="bg-black/30 p-1.5 rounded-2xl flex gap-2 shadow-inner">
                        <button 
                            onClick={() => setMenuTab('skills')}
                            className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${menuTab === 'skills' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg scale-105' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            🎮 Luyện Kỹ Năng
                        </button>
                        <button 
                            onClick={() => setMenuTab('textbook')}
                            className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${menuTab === 'textbook' ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg scale-105' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            📚 Bám Sát SGK
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {menuTab === 'skills' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                            {SKILL_ACTIVITIES.map(activity => (
                                <button
                                    key={activity.id}
                                    onClick={() => handleStartActivity(activity)}
                                    className="group relative flex flex-col items-start p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left overflow-hidden shadow-lg"
                                >
                                    <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-2xl opacity-20 ${activity.color}`}></div>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-lg ${activity.color} text-white`}>
                                        {activity.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 group-hover:text-cyan-300 transition-colors">{activity.title}</h3>
                                    <p className="text-sm opacity-70 leading-relaxed">{activity.description}</p>
                                    <div className="mt-6 flex items-center text-xs font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 group-hover:text-cyan-300 transition-all">
                                        {activity.externalUrl ? 'Mở Website' : 'Bắt đầu ngay'} <span className="ml-2">{activity.externalUrl ? '↗' : '→'}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="pb-4">
                            {/* Grade Selector */}
                            <div className="flex justify-center gap-4 mb-6">
                                <button 
                                    onClick={() => setTextbookGrade(6)} 
                                    className={`px-6 py-2 rounded-xl border border-white/20 transition-all ${textbookGrade === 6 ? 'bg-white text-indigo-900 font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                >
                                    Lớp 6
                                </button>
                                <button 
                                    onClick={() => setTextbookGrade(7)} 
                                    className={`px-6 py-2 rounded-xl border border-white/20 transition-all ${textbookGrade === 7 ? 'bg-white text-indigo-900 font-bold shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                >
                                    Lớp 7
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {TEXTBOOK_DATA[textbookGrade].map((unit: any) => (
                                    <button
                                        key={unit.unit}
                                        onClick={() => handleStartActivity({
                                            id: `unit_${textbookGrade}_${unit.unit}`,
                                            title: `Lớp ${textbookGrade} - Unit ${unit.unit}: ${unit.title}`,
                                            description: unit.desc,
                                            icon: '📖',
                                            color: unit.color,
                                            type: 'textbook'
                                        })}
                                        className="relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all text-left group overflow-hidden hover:-translate-y-1 shadow-md"
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${unit.color}`}></div>
                                        <h4 className="text-xs uppercase tracking-wider opacity-60 mb-1">Unit {unit.unit}</h4>
                                        <h3 className="text-lg font-bold mb-2 group-hover:text-cyan-300 transition-colors truncate">{unit.title}</h3>
                                        <p className="text-sm opacity-70 line-clamp-2">{unit.desc}</p>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-8 text-center text-sm opacity-50 bg-black/20 py-2 rounded-lg mx-auto w-fit px-4">
                                * Nội dung bám sát chương trình Giáo dục phổ thông mới (Global Success, Friends Plus...)
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    // --- Render: Practice Mode ---
    return (
        <section className="backdrop-blur-xl bg-[#1E1B3A]/80 border border-white/15 rounded-3xl p-4 md:p-6 shadow-2xl w-full max-w-3xl mx-auto h-full flex flex-col font-sans overflow-hidden">
            <header className="flex items-center justify-between mb-2 flex-shrink-0 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                    <button onClick={handleBackToMenu} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-200 border border-white/10 text-sm font-semibold transition group flex items-center gap-2">
                        <span className="group-hover:-translate-x-1 inline-block transition-transform">←</span> Quay lại
                    </button>
                    <div className="overflow-hidden">
                        <h1 className="text-xl font-bold truncate">{selectedActivity?.title}</h1>
                        <p className="opacity-60 text-xs truncate">
                            {isVisualMode ? "Chế độ Hình ảnh" : (selectedActivity?.type === 'textbook' ? `Ôn tập kiến thức SGK - Lớp ${textbookGrade}` : "Chế độ Hội thoại")}
                        </p>
                    </div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${selectedActivity?.color}`}>
                    {selectedActivity?.icon}
                </div>
            </header>
            
            {/* Visual Mode Input Area */}
            {isVisualMode && !generatedImage && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <div className="text-6xl mb-6 opacity-80">🎨</div>
                    <h3 className="text-2xl font-bold mb-3">Bạn muốn luyện tập chủ đề gì?</h3>
                    <p className="text-sm opacity-70 mb-8 max-w-md">Nhập một tình huống (ví dụ: "Phi hành gia uống trà sữa", "Lạc đường ở New York") và AI sẽ tạo ra hình ảnh để chúng ta cùng luyện tập.</p>
                    
                    <div className="w-full max-w-md flex flex-col gap-3">
                        <input 
                            type="text" 
                            value={visualTopic}
                            onChange={(e) => setVisualTopic(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') runWithApiKey(generateVisualScenario); }}
                            placeholder="Ví dụ: Phi hành gia uống trà sữa..."
                            className="w-full rounded-xl bg-white/10 border border-white/20 p-4 text-center placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-400 text-lg transition-all"
                        />
                        <button 
                            onClick={() => runWithApiKey(generateVisualScenario)}
                            disabled={isGeneratingImage || !visualTopic.trim()}
                            className="w-full px-6 py-4 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 disabled:opacity-50 transition shadow-lg transform active:scale-[0.98]"
                        >
                            {isGeneratingImage ? 'Đang vẽ tranh...' : 'Tạo Tình Huống & Bắt Đầu'}
                        </button>
                    </div>
                    {isGeneratingImage && <p className="mt-4 text-pink-300 animate-pulse text-sm">AI đang vẽ tranh và chuẩn bị bài học...</p>}
                </div>
            )}

            {(!isVisualMode || generatedImage) && (
                <>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 min-h-0 pt-4 custom-scrollbar">
                        {isVisualMode && generatedImage && (
                            <div className="w-full flex justify-center mb-6">
                                <div className="relative group max-w-sm">
                                    <img 
                                        src={generatedImage} 
                                        alt="AI generated scenario" 
                                        className="rounded-2xl shadow-2xl border-4 border-white/10 object-cover w-full h-auto transition hover:scale-[1.01]" 
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-2xl">
                                        <p className="text-xs font-bold text-white/90 uppercase tracking-wide">Chủ đề</p>
                                        <p className="text-sm text-white">{visualTopic}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {messages.map(msg => (
                            <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-lg">AI</div>}
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-white shadow-md leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                                <p>{msg.text}</p>
                                {msg.sender === 'ai' && (
                                        <button 
                                            onClick={() => runWithApiKey(() => playAudio(msg.text, `main-${msg.id}`))}
                                            disabled={loadingAudioKey === `main-${msg.id}`}
                                            className="mt-2 text-xl opacity-60 hover:opacity-100 transition-opacity inline-block"
                                            title="Nghe phát âm"
                                        >
                                            {loadingAudioKey === `main-${msg.id}` ? 
                                                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> 
                                                : '🔊'
                                            }
                                        </button>
                                )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex items-end gap-3 justify-start">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce"></div>
                                </div>
                                <div className="text-xs opacity-50 italic">AI đang trả lời...</div>
                            </div>
                        )}
                        
                        {/* Smart Tools Display Area */}
                        {(grammarFeedback || vocabList || suggestions) && (
                            <div className="mt-4 mx-2 p-4 rounded-2xl bg-black/40 border border-white/10 animate-fade-in backdrop-blur-md">
                                {grammarFeedback && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-bold text-yellow-300 mb-2 flex items-center gap-2">📝 Sửa lỗi Ngữ pháp</h4>
                                        <p className="text-sm text-white/90 bg-white/5 p-3 rounded-xl border-l-2 border-yellow-500">{grammarFeedback}</p>
                                    </div>
                                )}
                                {vocabList && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-bold text-green-300 mb-2 flex items-center gap-2">📚 Gợi ý Từ vựng</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {vocabList.map((v, i) => (
                                                <div key={i} className="text-xs bg-white/10 pl-2 pr-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                                                    <span className="font-bold text-green-200">{v.word}</span>
                                                    <span className="text-white/60 border-l border-white/20 pl-2">{v.meaning}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {suggestions && (
                                    <div>
                                        <h4 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">💡 Gợi ý Trả lời</h4>
                                        <div className="flex flex-col gap-2">
                                            {suggestions.map((s, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setInputText(s)}
                                                    className="text-left text-sm bg-white/5 hover:bg-cyan-500/20 p-3 rounded-xl border border-white/10 transition-colors group"
                                                >
                                                    <span className="opacity-80 group-hover:opacity-100">{s}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="text-center mt-3">
                                    <button onClick={resetTools} className="text-xs text-white/40 hover:text-white uppercase tracking-widest transition-colors">Đóng công cụ</button>
                                </div>
                            </div>
                        )}
                        
                        <div ref={chatEndRef} />
                    </div>

                    {/* Smart Tools Bar */}
                    <div className="flex gap-2 mb-3 mt-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
                         <button 
                            onClick={() => runWithApiKey(checkGrammar)} 
                            disabled={messages.length === 0 || isToolLoading}
                            className="flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-200 border border-yellow-500/30 hover:bg-yellow-500/20 transition disabled:opacity-30"
                         >
                            📝 Sửa lỗi câu vừa nói
                         </button>
                         <button 
                            onClick={() => runWithApiKey(getVocabSuggestions)} 
                            disabled={isToolLoading}
                            className="flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-full bg-green-500/10 text-green-200 border border-green-500/30 hover:bg-green-500/20 transition disabled:opacity-30"
                         >
                            📚 Gợi ý từ vựng
                         </button>
                         <button 
                            onClick={() => runWithApiKey(getReplySuggestions)} 
                            disabled={messages.length === 0 || isToolLoading}
                            className="flex-shrink-0 px-4 py-2 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/20 transition disabled:opacity-30"
                         >
                            💡 Bí từ? Gợi ý trả lời
                         </button>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center gap-3 flex-shrink-0 bg-[#1E1B3A]/50">
                        <button
                            onClick={handleMicClick}
                            className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-xl transition-all shadow-lg ${isRecording ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                            title="Ghi âm giọng nói"
                        >
                            🎤
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runWithApiKey(() => sendMessage(inputText)); } }}
                                placeholder="Nhập tin nhắn..."
                                className="w-full h-12 rounded-full bg-black/30 border border-white/10 pl-5 pr-12 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <button
                                onClick={() => runWithApiKey(() => sendMessage(inputText))}
                                disabled={isLoading || !inputText}
                                className="absolute right-1 top-1 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-transparent disabled:opacity-30 flex items-center justify-center transition-all"
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
};
// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { GoogleGenAI, Modality, Chat } from "@google/genai";
import { useApiKey } from '../context/ApiContext';
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const SCIENCE_CURRICULUM = {
    "Lớp 6": [
        { id: "khtn6_cel", title: "Tế bào - Đơn vị cơ sở của sự sống", prompt: "Cấu tạo tế bào thực vật và động vật" },
        { id: "khtn6_water", title: "Các thể của nước & Vòng tuần hoàn", prompt: "Vòng tuần hoàn của nước trong tự nhiên" },
        { id: "khtn6_force", title: "Lực và tác dụng của lực", prompt: "Biểu diễn lực và tác dụng của lực trong đời sống" },
        { id: "khtn6_mixture", title: "Hỗn hợp và chất tinh khiết", prompt: "Phân biệt hỗn hợp đồng nhất và không đồng nhất" },
        { id: "khtn6_oxygen", title: "Oxygen và không khí", prompt: "Thành phần của không khí và vai trò của Oxygen" }
    ],
    "Lớp 7": [
        { id: "khtn7_atom", title: "Nguyên tử & Bảng tuần hoàn", prompt: "Mô hình nguyên tử Rutherford - Bohr" },
        { id: "khtn7_speed", title: "Tốc độ chuyển động", prompt: "Đồ thị quãng đường - thời gian" },
        { id: "khtn7_sound", title: "Sóng âm & Độ to của âm", prompt: "Sự truyền sóng âm trong các môi trường" },
        { id: "khtn7_light", title: "Quang hợp ở thực vật", prompt: "Cơ chế quang hợp và vai trò của lá cây" },
        { id: "khtn7_magnet", title: "Từ trường Trái Đất", prompt: "Từ phổ và đường sức từ của Trái Đất" }
    ]
};

interface AILabAppProps {
    onExit?: () => void;
}

export const AILabApp = ({ onExit }: AILabAppProps) => {
  const { runWithApiKey, apiKey: ctxKey, handleError } = useApiKey();
  const apiKey = ctxKey || ENV_API_KEY;
  const [mode, setMode] = useState<'explore' | 'curriculum'>('curriculum');
  const [selectedGrade, setSelectedGrade] = useState('Lớp 6');
    
    const [concept, setConcept] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [explanation, setExplanation] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [error, setError] = useState('');
    
    const [followUp, setFollowUp] = useState('');
    const chatSessionRef = useRef<Chat | null>(null);
    const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);

    // Reset chat session when API key changes
    useEffect(() => {
        chatSessionRef.current = null;
    }, [apiKey]);

    const handleExplore = async (customQuery?: string) => {
        const queryToRun = customQuery || concept;
        
        if (!queryToRun) {
            setError('Vui lòng nhập một khái niệm hoặc chọn chủ đề.');
            return;
        }

        setIsLoading(true);
        setError('');
        
        // Reset state for new topic
        if (customQuery) {
             setConcept(customQuery);
        }
        
        if (!followUp) {
            setExplanation('');
            setImageUrl('');
            chatSessionRef.current = null;
            setConversationHistory([]); 
        }

        try {
            if (!apiKey) throw new Error("API Key is not set.");
            const ai = new GoogleGenAI({ apiKey });

            if (!chatSessionRef.current) {
                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: "Bạn là một giáo viên Khoa học Tự nhiên (STEM) nhiệt huyết. Nhiệm vụ của bạn là giải thích các hiện tượng khoa học một cách trực quan, dễ hiểu cho học sinh cấp 2. Hãy dùng so sánh, ẩn dụ đời sống. Trình bày ngắn gọn, chia đoạn rõ ràng.",
                    }
                });
            }

            const isFollowUpRequest = !!followUp;
            const currentInput = isFollowUpRequest ? followUp : queryToRun;

            const textPrompt = isFollowUpRequest
                ? currentInput
                : `Hãy giải thích ngắn gọn, thú vị về chủ đề: "${currentInput}" theo chương trình giáo dục phổ thông. Nêu 1 ứng dụng thực tế.`;
            
            const imagePrompt = `Tạo một hình ảnh 3D, khoa học, giáo dục, chi tiết cao về: "${currentInput}". Phong cách: Realistic, Educational Diagram, 8k resolution. Hình ảnh phải minh họa rõ ràng cơ chế hoặc cấu trúc.`;

            // Parallel execution for speed
            const [explanationResponse, imageResponse] = await Promise.all([
                chatSessionRef.current.sendMessage({ message: textPrompt }),
                // Only generate image for the main topic, not every follow-up unless specifically asked (optimized for quota)
                (!isFollowUpRequest || currentInput.toLowerCase().includes('vẽ') || currentInput.toLowerCase().includes('hình')) 
                    ? ai.models.generateContent({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: [{ text: imagePrompt }] },
                        config: { responseModalities: [Modality.IMAGE] },
                    })
                    : Promise.resolve(null)
            ]);

            const newExplanation = explanationResponse.text;
            setExplanation(newExplanation);

            setConversationHistory(prev => [
                ...prev,
                { role: 'user', text: currentInput },
                { role: 'model', text: newExplanation },
            ]);

            if (imageResponse) {
                const imageCandidate = imageResponse.candidates?.[0];
                const imagePart = imageCandidate?.content?.parts?.find(p => p.inlineData);

                if (imagePart?.inlineData) {
                    const base64ImageBytes = imagePart.inlineData.data;
                    const url = `data:image/png;base64,${base64ImageBytes}`;
                    setImageUrl(url);
                }
            }
            
            setFollowUp('');

        } catch (err) {
            console.error("Error in AI Lab:", err);
            if (handleError(err)) return;
            setError("Lỗi: " + (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleMouseMove3D = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const img = target.querySelector('img');
        if (!img) return;
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;
        const rotateY = 20 * ((x - width / 2) / width);
        const rotateX = -20 * ((y - height / 2) / height);
        img.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    };

    const handleMouseLeave3D = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const img = target.querySelector('img');
        if (!img) return;
        img.style.transform = `rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
    };

    return (
        <section className="bg-indigo-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl w-full max-w-5xl mx-auto h-full flex flex-col">
            <header className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="w-20"></div> {/* Spacer */}
                <div className="text-center">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]">
                        Phòng Thí Nghiệm Ảo 3D
                    </h1>
                    <p className="mt-2 text-white/80">Minh họa kiến thức Khoa học Tự nhiên bằng Công nghệ AI</p>
                </div>
                {onExit && (
                    <button onClick={onExit} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-200 border border-white/10 text-sm font-semibold transition">
                        Thoát
                    </button>
                )}
            </header>

            {/* Mode Switcher */}
            <div className="flex justify-center mb-6 flex-shrink-0">
                <div className="bg-black/30 p-1 rounded-xl flex gap-1">
                    <button 
                        onClick={() => setMode('curriculum')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'curriculum' ? 'bg-cyan-500 text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
                    >
                        📚 Bám sát SGK
                    </button>
                    <button 
                        onClick={() => setMode('explore')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'explore' ? 'bg-pink-500 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
                    >
                        🔍 Khám phá Tự do
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {!explanation && !imageUrl && !isLoading && (
                    <div className="animate-fade-in">
                        {mode === 'curriculum' ? (
                            <div className="space-y-6">
                                <div className="flex justify-center gap-4">
                                    {Object.keys(SCIENCE_CURRICULUM).map(grade => (
                                        <button 
                                            key={grade}
                                            onClick={() => setSelectedGrade(grade)}
                                            className={`px-4 py-2 rounded-full border border-white/20 transition-all ${selectedGrade === grade ? 'bg-white text-indigo-900 font-bold' : 'bg-white/5 hover:bg-white/10'}`}
                                        >
                                            {grade}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {SCIENCE_CURRICULUM[selectedGrade].map((topic) => (
                                        <button
                                            key={topic.id}
                                            onClick={() => runWithApiKey(() => handleExplore(topic.prompt))}
                                            className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all text-left hover:-translate-y-1 shadow-md"
                                        >
                                            <div className="absolute top-4 right-4 text-2xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all">🔬</div>
                                            <h3 className="font-bold text-lg mb-2 text-cyan-200 group-hover:text-cyan-100">{topic.title}</h3>
                                            <p className="text-sm opacity-70 group-hover:opacity-100">Bấm để xem mô phỏng 3D</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto text-center py-10">
                                <p className="mb-4 text-lg">Nhập bất kỳ khái niệm nào bạn muốn tìm hiểu:</p>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={concept}
                                        onChange={(e) => setConcept(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') runWithApiKey(() => handleExplore()); }}
                                        placeholder="Ví dụ: Hố đen, Tế bào gốc, Cấu trúc DNA..."
                                        className="w-full text-lg rounded-2xl bg-black/30 border-2 border-white/20 p-4 pl-6 pr-14 placeholder-white/40 focus:outline-none focus:ring-4 focus:ring-pink-500/30 focus:border-pink-500 transition-all"
                                    />
                                    <button 
                                        onClick={() => runWithApiKey(() => handleExplore())}
                                        className="absolute right-2 top-2 bottom-2 aspect-square bg-pink-500 rounded-xl flex items-center justify-center hover:bg-pink-400 transition"
                                    >
                                        ➤
                                    </button>
                                </div>
                                <div className="mt-6 flex flex-wrap justify-center gap-3">
                                    {["Sao Neutron", "Hiệu ứng nhà kính", "Virus vs Vi khuẩn", "Thuyết Tương đối"].map(tag => (
                                        <button key={tag} onClick={() => runWithApiKey(() => handleExplore(tag))} className="px-3 py-1 bg-white/10 rounded-full text-sm hover:bg-white/20 transition">{tag}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isLoading && (
                     <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
                        <div className="relative w-24 h-24">
                            <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-purple-400 border-l-transparent animate-spin"></div>
                            <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-pink-400 border-b-transparent border-l-yellow-400 animate-spin-reverse opacity-70"></div>
                        </div>
                        <p className="mt-6 text-lg font-medium text-cyan-200 animate-pulse">Đang tái tạo mô hình 3D & phân tích dữ liệu...</p>
                    </div>
                )}

                {!isLoading && (explanation || imageUrl) && (
                    <div className="animate-fade-in space-y-6 pb-6">
                        <button onClick={() => {setExplanation(''); setImageUrl(''); setFollowUp('');}} className="mb-2 text-sm text-white/60 hover:text-white underline">← Chọn chủ đề khác</button>
                        
                        <div className="grid lg:grid-cols-5 gap-6">
                            {/* Cột hình ảnh (chiếm 3 phần) */}
                            <div className="lg:col-span-3 bg-black/20 rounded-3xl border border-white/10 overflow-hidden relative group">
                                {imageUrl ? (
                                    <div
                                      onMouseMove={handleMouseMove3D}
                                      onMouseLeave={handleMouseLeave3D}
                                      style={{ perspective: '1000px' }}
                                      className="cursor-pointer w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-indigo-900/50 to-black"
                                    >
                                      <img 
                                        src={imageUrl} 
                                        alt={concept} 
                                        className="w-full h-auto object-contain max-h-[500px] transition-transform duration-100 ease-out shadow-2xl" 
                                      />
                                      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                          Di chuột để xem 3D
                                      </div>
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center opacity-70">Không có hình ảnh.</div>
                                )}
                            </div>

                            {/* Cột nội dung (chiếm 2 phần) */}
                            <div className="lg:col-span-2 flex flex-col gap-4">
                                <div className="bg-indigo-950/60 p-5 rounded-2xl border border-white/20 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
                                    <h2 className="text-xl font-bold mb-3 text-cyan-300 flex items-center gap-2">
                                        💡 Kiến thức trọng tâm
                                    </h2>
                                    <div className="prose prose-invert prose-sm">
                                        <p className="whitespace-pre-wrap leading-relaxed opacity-95 text-base">{explanation}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <label className="text-sm font-bold text-pink-300 mb-2 block">Bạn muốn biết thêm gì?</label>
                                    <div className="flex gap-2">
                                         <input
                                            type="text"
                                            value={followUp}
                                            onChange={(e) => setFollowUp(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') runWithApiKey(() => handleExplore(followUp)); }}
                                            placeholder="VD: Cấu tạo bên trong thế nào?"
                                            className="flex-grow rounded-xl bg-black/30 border border-white/20 p-3 text-sm focus:outline-none focus:border-pink-500"
                                        />
                                        <button
                                            onClick={() => runWithApiKey(() => handleExplore(followUp))}
                                            className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 font-bold transition"
                                        >
                                            Hỏi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {error && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-rose-900/90 border border-rose-500 text-white rounded-full shadow-xl animate-fade-in z-50">{error}</div>}
        </section>
    );
};

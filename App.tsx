import React, { useState, useMemo, useEffect } from "react";
import { ApiProvider } from "./src/context/ApiContext";
import { Sidebar } from "./src/components/Sidebar";
import { MemoryGame } from "./src/components/MemoryGame";
import { AILabApp } from "./src/views/AILabApp";
import { KidGeniusApp } from "./src/views/KidGeniusApp";
import { EnglishPracticeApp } from "./src/views/EnglishPracticeApp";
import { QuizMasterApp } from "./src/views/QuizMasterApp";

// ===================================
//      MAIN APP Component
// ===================================
export const App = () => {
    const [view, setView] = useState('dashboard');
    const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
    const [showMemoryGame, setShowMemoryGame] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        englishScore: 0,
        scienceExplored: 0,
        quizzesTaken: 0,
        badges: [] as string[]
    });

    const MOCK_USER = useMemo(() => ({
        uid: userRole === 'teacher' ? 'demo_teacher_001' : 'demo_student_001',
        displayName: userRole === 'teacher' ? 'Giáo viên Demo' : 'Học sinh Demo',
    }), [userRole]);

    const MOCK_USER_PROFILE = useMemo(() => ({
        displayName: userRole === 'teacher' ? 'Giáo viên Demo' : 'Học sinh Demo',
        role: userRole,
    }), [userRole]);

    // Giả lập lấy dữ liệu thống kê từ localStorage để hiển thị Dashboard xịn hơn
    useEffect(() => {
        if (userRole === 'student') {
            // Lấy dữ liệu thật từ các localStorage key của các app con
            const quizHistory = JSON.parse(localStorage.getItem(`kidGeniusHistory_${MOCK_USER.uid}_Lớp 6_Toán`) || '[]');
            const quizCount = quizHistory.length;
            
            // Tính toán giả lập cho demo
            setStats({
                englishScore: 75, // Demo progress
                scienceExplored: 12,
                quizzesTaken: quizCount,
                badges: ['Khởi động', 'Nhà thám hiểm', 'Thần đồng Toán học']
            });
        }
    }, [userRole, MOCK_USER.uid]);

    const handleExitApp = () => {
        setView('dashboard');
    };

    const renderAppContent = () => {
        switch (view) {
            case 'aiLab':
                return <AILabApp onExit={handleExitApp} />;
            case 'kidGenius':
                return <KidGeniusApp currentUser={MOCK_USER} onExit={handleExitApp} />;
            case 'english':
                return <EnglishPracticeApp onExit={handleExitApp} />;
            case 'quizMaster':
                return <QuizMasterApp userRole={MOCK_USER_PROFILE.role} onExit={handleExitApp} />;
            case 'dashboard':
            default:
                const toolsForRole = {
                    teacher: [
                        { id: 'quizMaster', title: 'Trợ lý Dạy học & Soạn bài', desc: 'Tạo bộ tài liệu, đề thi từ PDF/Text trong 5 giây.', icon: '📚', color: 'bg-emerald-500' },
                        { id: 'kidGenius', title: 'Theo dõi Học sinh', desc: 'Xem tiến độ và lộ trình học tập của lớp.', icon: '📊', color: 'bg-blue-500' },
                        { id: 'english', title: 'Giáo trình Tiếng Anh', desc: 'Truy cập kho bài học bám sát SGK.', icon: '💬', color: 'bg-purple-500' },
                        { id: 'aiLab', title: 'Thư viện 3D', desc: 'Minh họa bài giảng bằng hình ảnh trực quan.', icon: '🔬', color: 'bg-pink-500' },
                    ],
                    student: [
                        { id: 'english', title: 'Luyện Tiếng Anh 3D', desc: 'Hội thoại, đóng vai và ôn tập theo Unit SGK.', icon: '💬', color: 'bg-purple-500' },
                        { id: 'kidGenius', title: 'Gia Sư AI Riêng', desc: 'Lộ trình 4 tuần cải thiện điểm số môn học.', icon: '✨', color: 'bg-blue-500' },
                        { id: 'aiLab', title: 'Phòng Thí Nghiệm Ảo', desc: 'Giải thích khái niệm khó bằng hình ảnh AI.', icon: '🔬', color: 'bg-pink-500' },
                        { id: 'quizMaster', title: 'Tự Ôn Tập', desc: 'Biến tài liệu PDF thành thẻ ghi nhớ (Flashcard).', icon: '🧠', color: 'bg-amber-500' },
                    ]
                };

                return (
                    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-8 animate-fade-in">
                        {/* Header & Stats Section */}
                        <header className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
                                    Xin chào, {MOCK_USER_PROFILE.displayName}! 👋
                                </h1>
                                <p className="text-lg opacity-80">
                                    {userRole === 'teacher' 
                                        ? 'Thầy/Cô muốn chuẩn bị bài giảng gì hôm nay?' 
                                        : 'Hôm nay chúng ta sẽ chinh phục kiến thức nào?'}
                                </p>
                            </div>
                            
                            {/* Student Gamification Stats */}
                            {userRole === 'student' && (
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col justify-center">
                                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-70 mb-3">Hồ sơ năng lực</h3>
                                    <div className="flex justify-between text-center divide-x divide-white/20">
                                        <div className="px-2">
                                            <div className="text-2xl font-bold text-yellow-400">🏅 {stats.badges.length}</div>
                                            <div className="text-xs opacity-70">Huy hiệu</div>
                                        </div>
                                        <div className="px-2">
                                            <div className="text-2xl font-bold text-green-400">📚 {stats.quizzesTaken}</div>
                                            <div className="text-xs opacity-70">Bài thi</div>
                                        </div>
                                        <div className="px-2">
                                            <div className="text-2xl font-bold text-pink-400">💡 {stats.scienceExplored}</div>
                                            <div className="text-xs opacity-70">Khám phá</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </header>

                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6"></div>

                        {/* Main Tools Grid */}
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-cyan-300">⚡</span> Truy cập nhanh ứng dụng
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(toolsForRole[MOCK_USER_PROFILE.role] || []).map(tool => (
                                <button 
                                    key={tool.id} 
                                    onClick={() => setView(tool.id)} 
                                    className="group relative overflow-hidden p-6 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-all duration-300 text-left hover:-translate-y-1 shadow-lg"
                                >
                                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full blur-2xl opacity-20 ${tool.color}`}></div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg ${tool.color} text-white group-hover:scale-110 transition-transform`}>
                                        {tool.icon}
                                    </div>
                                    <h3 className="font-bold text-lg mb-1 group-hover:text-cyan-200 transition-colors">{tool.title}</h3>
                                    <p className="text-sm opacity-60 leading-relaxed">{tool.desc}</p>
                                </button>
                            ))}
                        </div>

                        {/* Motivation / Badge Section */}
                        {userRole === 'student' && (
                            <div className="mt-8 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-3xl p-6 border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg">🏆 Bộ sưu tập Huy hiệu</h3>
                                    <span className="text-xs px-2 py-1 bg-white/10 rounded-full">Xem tất cả</span>
                                </div>
                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {stats.badges.map((badge, idx) => (
                                        <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[80px]">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 p-1 shadow-lg flex items-center justify-center">
                                                <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center text-2xl">
                                                    👑
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-center">{badge}</span>
                                        </div>
                                    ))}
                                    <div className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[80px] opacity-40 grayscale">
                                        <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center text-2xl">
                                            🔒
                                        </div>
                                        <span className="text-xs font-semibold text-center">Bí ẩn</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    const renderBackground = () => (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="parallax-bg opacity-30" style={{
                backgroundImage: 'url(https://firebasestorage.googleapis.com/v0/b/svelteshot-425216.appspot.com/o/public%2Fsparkle-edu%2Fparallax-bg.png?alt=media&token=8039c9f2-257a-4223-952b-7c5e87a2d67a)',
                animationDuration: '60s'
            }}></div>
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-[#0f172a] to-[#0c0a18]"></div>
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="sparkle opacity-30" style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${Math.random() * 5 + 5}s`,
                    animationDelay: `${Math.random() * 5}s`,
                }}></div>
            ))}
        </div>
    );
    
    return (
        <ApiProvider>
            <main className="h-full w-full text-white bg-[#0c0a18] relative overflow-hidden font-sans selection:bg-cyan-500/30">
                {renderBackground()}
                
                <div className="relative z-10 h-full w-full flex">
                    {userRole ? (
                        <>
                            <Sidebar view={view} setView={setView} onLogout={() => setUserRole(null)} isSidebarOpen={isSidebarOpen} />
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <header className="md:hidden p-4 flex items-center gap-4 bg-white/5 backdrop-blur-lg border-b border-white/10 z-20">
                                     <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-white/10">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                                    </button>
                                     <h1 className="text-lg font-bold text-white tracking-wide">EduSpark AI</h1>
                                </header>
                                <div className="flex-1 overflow-y-auto scroll-smooth">
                                    {renderAppContent()}
                                </div>
                            </div>
                            {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-10" onClick={() => setIsSidebarOpen(false)}></div>}
                        </>
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                            {showMemoryGame && <MemoryGame onClose={() => setShowMemoryGame(false)} />}
                            <div className="relative z-10 max-w-6xl w-full">
                                <div className="mb-10 inline-block">
                                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.5)] mb-4">
                                        EduSpark AI
                                    </h1>
                                    <p className="text-xl md:text-2xl text-blue-100/80 font-light">
                                        Hệ sinh thái học tập thông minh dành cho Kỷ nguyên số
                                    </p>
                                </div>
                                
                                <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto">
                                    <button 
                                        onClick={() => setUserRole('teacher')}
                                        className="group relative p-8 rounded-[2rem] bg-indigo-900/30 backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 hover:bg-indigo-900/50 transition-all duration-300 hover:-translate-y-2 shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="text-7xl mb-6 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg">👩‍🏫</div>
                                        <h2 className="text-3xl font-bold text-cyan-300 mb-2">Giáo viên</h2>
                                        <p className="text-white/60 text-sm leading-relaxed">Công cụ soạn bài giảng, tạo đề thi tự động và theo dõi lớp học.</p>
                                    </button>
                                    
                                    <button 
                                        onClick={() => setUserRole('student')}
                                        className="group relative p-8 rounded-[2rem] bg-indigo-900/30 backdrop-blur-xl border border-white/10 hover:border-purple-400/50 hover:bg-indigo-900/50 transition-all duration-300 hover:-translate-y-2 shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="text-7xl mb-6 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg">🎓</div>
                                        <h2 className="text-3xl font-bold text-purple-300 mb-2">Học sinh</h2>
                                        <p className="text-white/60 text-sm leading-relaxed">Gia sư AI riêng 24/7, lộ trình học tập cá nhân hóa và ôn thi.</p>
                                    </button>
                                    
                                    <button 
                                        onClick={() => setShowMemoryGame(true)}
                                        className="group relative p-8 rounded-[2rem] bg-indigo-900/30 backdrop-blur-xl border border-white/10 hover:border-yellow-400/50 hover:bg-indigo-900/50 transition-all duration-300 hover:-translate-y-2 shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="text-7xl mb-6 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg">🎮</div>
                                        <h2 className="text-3xl font-bold text-yellow-300 mb-2">Giải trí</h2>
                                        <p className="text-white/60 text-sm leading-relaxed">Vừa học vừa chơi với các thử thách trí tuệ nhẹ nhàng.</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </ApiProvider>
    );
};
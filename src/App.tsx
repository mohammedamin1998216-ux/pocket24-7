import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Crown, 
  Settings, 
  TrendingUp, 
  Home, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  User, 
  Bell, 
  Moon, 
  Sun, 
  LogOut, 
  Headset, 
  Shield, 
  Activity, 
  Coins, 
  DollarSign, 
  Globe, 
  Sparkles, 
  RefreshCw,
  AlertTriangle,
  Send,
  Loader2,
  Newspaper
} from 'lucide-react';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc 
} from 'firebase/firestore';
import { Language, translations } from './lib/translations';
import { InteractiveChart } from './components/InteractiveChart';
import { UserProfile, Transaction, CoinData, VipPlan } from './types';

export default function App() {
  // Localization & Theme States
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('pocket24_lang') as Language) || 'ar';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pocket24_dark_mode');
    return saved === null ? true : saved === 'true';
  });

  // UI state
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'market' | 'vip' | 'wallet' | 'admin'>('home');
  const [walletSubTab, setWalletSubTab] = useState<'overview' | 'deposit' | 'withdraw' | 'transfer' | 'history'>('overview');
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    return localStorage.getItem('pocket24_balance_hidden') === 'true';
  });

  // Auth & Database States
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Modal active flags
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Copy status
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Transaction Inputs
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('trc20');
  const [depositNetwork, setDepositNetwork] = useState('trc20');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferPassword, setTransferPassword] = useState('');

  // Interactive Forex Chart Timeframe
  const [timeframe, setTimeframe] = useState('1');

  // Sparkline data generation for top 10 coins
  const [coinsList, setCoinsList] = useState<CoinData[]>([]);

  // Market News Grounding state
  const [marketNews, setMarketNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState<boolean>(true);

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast Trigger Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Static deposit addresses
  const DEPOSIT_ADDRESSES = {
    trc20: 'TK7y8GfdhXqNGf7wGC6xhDg88twXbQoJAn',
    bep20: '0x4D3389699Fa5c747E6b66b7ed50De6450054D7Ba',
    erc20: '0x4D3389699Fa5c747E6b66b7ed50De6450054D7Ba'
  };

  // VIP Offers Tier list
  const vipOffers: VipPlan[] = [
    { id: 'vip-1', deposit: 50, dailyProfit: 10.00, monthlyProfit: 300, isHot: false },
    { id: 'vip-2', deposit: 75, dailyProfit: 15.00, monthlyProfit: 450, isHot: false },
    { id: 'vip-3', deposit: 100, dailyProfit: 20.00, monthlyProfit: 600, isHot: true },
    { id: 'vip-4', deposit: 150, dailyProfit: 30.00, monthlyProfit: 900, isHot: false },
    { id: 'vip-5', deposit: 200, dailyProfit: 40.00, monthlyProfit: 1200, isHot: false },
    { id: 'vip-6', deposit: 250, dailyProfit: 50.00, monthlyProfit: 1500, isHot: false },
    { id: 'vip-7', deposit: 300, dailyProfit: 60.00, monthlyProfit: 1800, isHot: false },
    { id: 'vip-8', deposit: 350, dailyProfit: 70.00, monthlyProfit: 2100, isHot: false },
    { id: 'vip-9', deposit: 400, dailyProfit: 80.00, monthlyProfit: 2400, isHot: false },
    { id: 'vip-10', deposit: 500, dailyProfit: 100.00, monthlyProfit: 3000, isHot: false }
  ];

  // Language translation helper
  const t = (key: keyof typeof translations['ar']) => {
    return translations[lang][key] || key;
  };

  // Handle dark mode setup
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode, lang]);

  // Generate top 10 coin details with dynamic sparklines
  useEffect(() => {
    const defaultCoins = [
      { name: 'Bitcoin', symbol: 'BTC', price: 67842.00, change: '+0.7%', color: '#f7931a' },
      { name: 'Ethereum', symbol: 'ETH', price: 3210.80, change: '+1.8%', color: '#6b8cff' },
      { name: 'BNB', symbol: 'BNB', price: 580.32, change: '-0.3%', color: '#f0b90b' },
      { name: 'Solana', symbol: 'SOL', price: 142.35, change: '+2.4%', color: '#9f7aea' },
      { name: 'XRP', symbol: 'XRP', price: 0.587, change: '+0.2%', color: '#23a2f6' },
      { name: 'Cardano', symbol: 'ADA', price: 0.455, change: '-1.1%', color: '#3b82f6' },
      { name: 'Dogecoin', symbol: 'DOGE', price: 0.142, change: '+5.2%', color: '#fbbf24' },
      { name: 'Avalanche', symbol: 'AVAX', price: 35.67, change: '+0.9%', color: '#e84142' },
      { name: 'Polkadot', symbol: 'DOT', price: 6.82, change: '-0.7%', color: '#e6007a' },
      { name: 'Polygon', symbol: 'MATIC', price: 0.789, change: '+1.3%', color: '#8247e5' }
    ];

    const mapped = defaultCoins.map(coin => {
      const sparkline = Array.from({ length: 15 }, () => coin.price * (1 + (Math.random() - 0.5) * 0.03));
      return { ...coin, sparkline };
    });

    setCoinsList(mapped);

    // Refresh coin ticks every 4 seconds
    const interval = setInterval(() => {
      setCoinsList(prev => prev.map(coin => {
        const changePercent = (Math.random() - 0.5) * 0.005;
        const nextPrice = coin.price * (1 + changePercent);
        const nextChange = changePercent >= 0 ? `+${(changePercent * 100).toFixed(1)}%` : `${(changePercent * 100).toFixed(1)}%`;
        const updatedSparkline = [...coin.sparkline.slice(1), nextPrice];
        return {
          ...coin,
          price: parseFloat(nextPrice.toFixed(2)),
          change: nextChange,
          sparkline: updatedSparkline
        };
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Fetch market news using Google Search Grounding from our server API
  useEffect(() => {
    let active = true;
    const fetchNews = async () => {
      try {
        setLoadingNews(true);
        const response = await fetch(`/api/market-news?lang=${lang}`);
        if (!response.ok) {
          throw new Error("Failed to fetch news");
        }
        const data = await response.json();
        if (active && data && Array.isArray(data.news)) {
          setMarketNews(data.news);
        }
      } catch (err) {
        console.error("Error loading news in frontend:", err);
      } finally {
        if (active) {
          setLoadingNews(false);
        }
      }
    };

    fetchNews();
    return () => {
      active = false;
    };
  }, [lang]);

  // Firebase auth state tracking and real-time Firestore database synchronization
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Real-time synchronization of current user profile
        const userDocRef = doc(db, "users", currentUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // First time auto profile creation
            const randCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            const randUserId = Math.floor(10000000 + Math.random() * 90000000).toString();
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              firstName: currentUser.displayName?.split(' ')[0] || 'User',
              lastName: currentUser.displayName?.split(' ')[1] || 'Name',
              username: currentUser.email?.split('@')[0] || 'trader',
              userId: randUserId,
              balance: 0.00,
              totalDeposits: 0.00,
              todayProfit: 0.00,
              availableBalance: 0.00,
              frozenBalance: 0.00,
              referralCode: randCode,
              referralLink: `${window.location.origin}/ref/${randCode}`,
              createdAt: new Date().toISOString(),
              vipPlanId: null,
              vipPlanSubscribedAt: null
            };
            try {
              await setDoc(userDocRef, newProfile);
              setProfile(newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        });

        // Real-time synchronization of transactions
        const transactionsQuery = query(
          collection(db, "transactions"),
          where("uid", "==", currentUser.uid)
        );
        const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
          const txsList: Transaction[] = [];
          snapshot.forEach(doc => {
            txsList.push({ id: doc.id, ...doc.data() } as Transaction);
          });
          // Sort client-side by date desc
          txsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(txsList);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, "transactions");
        });

        return () => {
          unsubscribeProfile();
          unsubscribeTransactions();
        };
      } else {
        setProfile(null);
        setTransactions([]);
      }
    });

    // Hide splash screen after initialization
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => {
      unsubscribeAuth();
      clearTimeout(timer);
    };
  }, []);

  // Standard Email & Password Authentication Login Action
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      triggerToast('الرجاء تعبئة البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoadingAction('login');
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      triggerToast('تم تسجيل الدخول بنجاح!');
      setActiveModal(null);
    } catch (error: any) {
      triggerToast(`خطأ: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Standard Email & Password Sign Up Action
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !firstName || !lastName || !username) {
      triggerToast('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoadingAction('signup');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      const uid = userCredential.user.uid;
      const randCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const randUserId = Math.floor(10000000 + Math.random() * 90000000).toString();

      const newProfile: UserProfile = {
        uid,
        email: authEmail,
        firstName,
        lastName,
        username,
        userId: randUserId,
        balance: 0.00,
        totalDeposits: 0.00,
        todayProfit: 0.00,
        availableBalance: 0.00,
        frozenBalance: 0.00,
        referralCode: randCode,
        referralLink: `${window.location.origin}/ref/${randCode}`,
        inviteCodeUsed: inviteCode || undefined,
        createdAt: new Date().toISOString(),
        vipPlanId: null,
        vipPlanSubscribedAt: null
      };

      await setDoc(doc(db, "users", uid), newProfile);
      triggerToast('تم إنشاء الحساب وحفظ الملف الشخصي بنجاح!');
      setActiveModal(null);
    } catch (error: any) {
      triggerToast(`فشل التسجيل: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Real Sign In with Google Action (Auth Popup)
  const handleGoogleSignIn = async () => {
    setLoadingAction('google');
    try {
      await signInWithPopup(auth, googleProvider);
      triggerToast('تم تسجيل الدخول بواسطة Google بنجاح!');
      setActiveModal(null);
    } catch (error: any) {
      triggerToast(`فشل تسجيل الدخول بواسطة جوجل: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Sign out Action
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      triggerToast('تم تسجيل الخروج بنجاح.');
      setActiveTab('home');
    } catch (error: any) {
      triggerToast(`خطأ أثناء الخروج: ${error.message}`);
    }
  };

  // Simulated Payment / Direct Funds Addition for developer testing
  const handleSimulateAddFunds = async () => {
    if (!user || !profile) return;
    setLoadingAction('addFunds');
    try {
      const amountToAdd = 500;
      const userDocRef = doc(db, "users", user.uid);
      const newBalance = (profile.balance || 0) + amountToAdd;
      const newTotalDeposits = (profile.totalDeposits || 0) + amountToAdd;
      const newAvailable = (profile.availableBalance || 0) + amountToAdd;

      await updateDoc(userDocRef, {
        balance: newBalance,
        totalDeposits: newTotalDeposits,
        availableBalance: newAvailable
      });

      // Insert transaction history log
      await addDoc(collection(db, "transactions"), {
        uid: user.uid,
        type: 'deposit',
        amount: amountToAdd,
        status: 'completed',
        date: new Date().toISOString(),
        network: 'USDT-TRC20',
        addressOrRecipient: DEPOSIT_ADDRESSES.trc20
      });

      triggerToast('تم إضافة 500 USDT بنجاح وتحديث المحفظة!');
      setActiveModal(null);
    } catch (error: any) {
      triggerToast(`خطأ: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Real VIP Plan Subscription handling inside Firestore
  const handleSubscribeVip = async (plan: VipPlan) => {
    if (!user || !profile) {
      setActiveModal('auth');
      return;
    }
    if ((profile.availableBalance || 0) < plan.deposit) {
      triggerToast(t('insufficientBalance'));
      return;
    }

    setLoadingAction(`vip-${plan.id}`);
    try {
      const userDocRef = doc(db, "users", user.uid);
      const nextAvailable = (profile.availableBalance || 0) - plan.deposit;
      const nextFrozen = (profile.frozenBalance || 0) + plan.deposit;

      await updateDoc(userDocRef, {
        availableBalance: nextAvailable,
        frozenBalance: nextFrozen,
        vipPlanId: plan.id,
        vipPlanSubscribedAt: new Date().toISOString()
      });

      // Log subscription in Transactions
      await addDoc(collection(db, "transactions"), {
        uid: user.uid,
        type: 'vip_subscribe',
        amount: plan.deposit,
        status: 'completed',
        date: new Date().toISOString(),
        addressOrRecipient: `VIP Level - Deposit $${plan.deposit}`
      });

      triggerToast(t('vipSuccess'));
    } catch (error: any) {
      triggerToast(`فشل الاشتراك: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Real Internal Transfer execution via Firestore state mutation
  const handleInternalTransfer = async () => {
    if (!user || !profile) return;
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      triggerToast('الرجاء إدخال مبلغ صحيح');
      return;
    }
    if ((profile.availableBalance || 0) < amount) {
      triggerToast('رصيد غير كافٍ للتحويل');
      return;
    }
    if (!transferRecipient) {
      triggerToast('يرجى تحديد اسم أو كود المستلم');
      return;
    }

    setLoadingAction('transfer');
    try {
      const userDocRef = doc(db, "users", user.uid);
      const nextAvailable = (profile.availableBalance || 0) - amount;
      const nextBalance = (profile.balance || 0) - amount;

      await updateDoc(userDocRef, {
        availableBalance: nextAvailable,
        balance: nextBalance
      });

      // Log outbound transfer transaction
      await addDoc(collection(db, "transactions"), {
        uid: user.uid,
        type: 'transfer_out',
        amount: amount,
        status: 'completed',
        date: new Date().toISOString(),
        addressOrRecipient: transferRecipient
      });

      triggerToast(t('transferSuccess'));
      setTransferAmount('');
      setTransferRecipient('');
      setTransferPassword('');
    } catch (error: any) {
      triggerToast(`خطأ في التحويل: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Real Withdrawal execution logging to Firestore
  const handleWithdrawAction = async () => {
    if (!user || !profile) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 10) {
      triggerToast('الحد الأدنى للسحب هو 10 USDT');
      return;
    }
    if ((profile.availableBalance || 0) < amount) {
      triggerToast('رصيد غير كافٍ للسحب');
      return;
    }
    if (!withdrawAddress) {
      triggerToast('يرجى إدخال عنوان المحفظة');
      return;
    }

    setLoadingAction('withdraw');
    try {
      const userDocRef = doc(db, "users", user.uid);
      const nextAvailable = (profile.availableBalance || 0) - amount;
      const nextBalance = (profile.balance || 0) - amount;

      await updateDoc(userDocRef, {
        availableBalance: nextAvailable,
        balance: nextBalance
      });

      // Log withdrawal transaction (Pending state for admin verification)
      await addDoc(collection(db, "transactions"), {
        uid: user.uid,
        type: 'withdraw',
        amount: amount,
        status: 'pending',
        date: new Date().toISOString(),
        network: withdrawNetwork.toUpperCase(),
        addressOrRecipient: withdrawAddress
      });

      triggerToast(t('withdrawSuccess'));
      setWithdrawAmount('');
      setWithdrawAddress('');
      setActiveModal(null);
    } catch (error: any) {
      triggerToast(`فشل السحب: ${error.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  // Helper copy function with timeout feedback
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    triggerToast(t('copied'));
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-[#08090f] via-[#040407] to-[#010103] text-slate-100 p-0 sm:p-4 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* 480px Centered Mobile Frame container */}
      <div id="pocket24-app-container" className="w-full max-w-[480px] h-[100dvh] sm:h-[880px] sm:rounded-[36px] bg-slate-950 border border-slate-900 shadow-3xl shadow-black/80 relative flex flex-col overflow-hidden">
        
        {/* Splash screen animation overlay */}
        <AnimatePresence>
          {showSplash && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 bg-[#040407] z-[999] flex flex-col items-center justify-center text-white"
            >
              <motion.div 
                animate={{ scale: [0.95, 1.03, 0.95] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-widest font-display"
              >
                Pocket24
              </motion.div>
              <div className="text-slate-500 text-xs tracking-wider mt-3 font-semibold font-display">
                منصة التداول الاحترافية الموثوقة
              </div>
              <div className="w-12 h-[3px] bg-slate-900 rounded-full mt-8 overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 animate-[loading_1.2s_infinite_ease-in-out]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Connection Header Status line */}
        <div className="w-full h-8 flex justify-between items-center px-4 py-1 text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-900 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg animate-pulse" />
            <span>{t('connected')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            <select 
              value={lang} 
              onChange={(e) => {
                const selected = e.target.value as Language;
                setLang(selected);
                localStorage.setItem('pocket24_lang', selected);
              }}
              className="bg-transparent border-none text-[11px] font-bold text-slate-400 outline-none cursor-pointer"
            >
              <option value="ar" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold">العربية (AR)</option>
              <option value="en" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold">English (EN)</option>
              <option value="fr" className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold">Français (FR)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Navigation Body Content Container */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 scrollbar-none scroll-smooth">
          
          {/* Welcome Screen (if not logged in) */}
          {!user ? (
            <div className="w-full h-full flex flex-col justify-between py-6">
              <div className="text-center my-auto flex flex-col justify-center">
                <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-wider mb-2">
                  {t('appName')}
                </div>
                <div className="text-slate-400 text-lg font-medium">
                  {t('welcomeSlogan')}
                </div>

                <div className="flex flex-col gap-3 mt-12 w-full max-w-[320px] mx-auto">
                  <button 
                    onClick={() => {
                      setIsSignUp(false);
                      setActiveModal('auth');
                    }}
                    className="w-full py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {t('login')}
                  </button>
                  <button 
                    onClick={() => {
                      setIsSignUp(true);
                      setActiveModal('auth');
                    }}
                    className="w-full py-4 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-slate-50 font-bold text-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {t('signup')}
                  </button>

                  <div className="flex items-center justify-center gap-2 my-2 text-slate-400 text-sm">
                    <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800" />
                    <span>{t('or')}</span>
                    <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800" />
                  </div>

                  {/* Real Single Tap Google Sign In Button */}
                  <button 
                    onClick={handleGoogleSignIn}
                    className="w-full py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.97 1 12 1 7.35 1 3.42 3.68 1.5 7.6l3.86 3C6.27 7.72 8.9 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.91 3.41-8.55z" />
                      <path fill="#FBBC05" d="M5.36 14.6c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.5 7.24C.54 9.17 0 11.31 0 13.56s.54 4.39 1.5 6.32l3.86-3.28z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.02.68-2.33 1.09-3.92 1.09-3.1 0-5.73-2.08-6.67-4.88L1.79 16.7C3.71 20.44 7.55 23 12 23z" />
                    </svg>
                    <span>{t('googleLogin')}</span>
                  </button>
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 mt-auto flex flex-col gap-2">
                <span>{t('trustedPlatform')}</span>
                <div className="flex gap-4 justify-center">
                  <span onClick={() => setActiveModal('support')} className="text-blue-500 hover:underline cursor-pointer">{t('support')}</span>
                  <span onClick={() => setActiveModal('legal')} className="text-blue-500 hover:underline cursor-pointer">{t('legal')}</span>
                </div>
              </div>
            </div>
          ) : (
            
            // Primary Application Tabs Switcher
            <div>
              {/* TAB 1: HOME (الرئيسية) */}
              {activeTab === 'home' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  
                  {/* Top Welcome Title Grid Header */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                        {t('appName')}
                      </h1>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        {profile ? `${profile.firstName} ${profile.lastName}` : '...'}
                      </p>
                    </div>
                    {profile?.vipPlanId && (
                      <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-1.5 text-xs font-bold animate-pulse">
                        <Crown className="w-3.5 h-3.5" />
                        <span>VIP Active</span>
                      </div>
                    )}
                  </div>

                  {/* Main Wallet Card */}
                  <div className="w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-5 shadow-xl shadow-slate-100 dark:shadow-none mb-4 relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                        <Wallet className="w-4 h-4 text-blue-500" />
                        <span>{t('totalWallet')}</span>
                      </div>
                      <button 
                        onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {isBalanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="text-4xl font-black font-mono tracking-tight text-slate-800 dark:text-white">
                      {isBalanceHidden ? '****' : `$${(profile?.balance || 0).toFixed(2)}`}
                    </div>

                    <div className="text-[12px] font-bold text-slate-400 dark:text-slate-500 mt-1.5">
                      {t('margin')}: $0.00
                    </div>

                    <div className="flex gap-2.5 mt-5">
                      <button 
                        onClick={() => {
                          setWalletSubTab('deposit');
                          setActiveTab('wallet');
                        }}
                        className="flex-1 py-3 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20 cursor-pointer"
                      >
                        {t('addFunds')}
                      </button>
                      <button 
                        onClick={() => {
                          setWalletSubTab('overview');
                          setActiveTab('wallet');
                        }}
                        className="flex-1 py-3 px-4 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 border border-slate-100 dark:border-slate-800 font-bold text-sm active:scale-[0.98] transition-transform cursor-pointer"
                      >
                        {t('viewWallet')}
                      </button>
                    </div>
                  </div>

                  {/* Start Trading CTA Banner */}
                  <div 
                    onClick={() => setActiveTab('market')}
                    className="w-full rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-950/30 p-4 flex justify-between items-center cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all mb-5"
                  >
                    <div>
                      <h3 className="font-black text-blue-900 dark:text-blue-300 text-sm">
                        {t('startTrade')}
                      </h3>
                      <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                        {t('openFutures')}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* 4 Quick Actions grid */}
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    <button 
                      onClick={() => setActiveModal('invite')}
                      className="py-3 px-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-md shadow-slate-100/50 dark:shadow-none cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-1.5">
                        <User className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold">{t('invite')}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setWalletSubTab('withdraw');
                        setActiveTab('wallet');
                      }}
                      className="py-3 px-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-md shadow-slate-100/50 dark:shadow-none cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-1.5">
                        <ArrowDownLeft className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold">{t('withdraw')}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setWalletSubTab('transfer');
                        setActiveTab('wallet');
                      }}
                      className="py-3 px-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-md shadow-slate-100/50 dark:shadow-none cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-1.5">
                        <Send className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold">{t('transfer')}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setWalletSubTab('deposit');
                        setActiveTab('wallet');
                      }}
                      className="py-3 px-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-md shadow-slate-100/50 dark:shadow-none cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mb-1.5">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold">{t('deposit')}</span>
                    </button>
                  </div>

                  {/* Mini market watchlist preview */}
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                        <TrendingUp className="w-4.5 h-4.5 text-blue-500" />
                        <span>{t('marketPrices')}</span>
                      </h4>
                      <button 
                        onClick={() => setActiveTab('market')}
                        className="text-xs font-black text-blue-500 hover:underline cursor-pointer"
                      >
                        {lang === 'ar' ? 'عرض الكل' : lang === 'en' ? 'View All' : 'Voir tout'}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {coinsList.slice(0, 3).map((coin, index) => {
                        const isPos = coin.change.startsWith('+');
                        return (
                          <div 
                            key={index} 
                            onClick={() => setActiveTab('market')}
                            className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-3.5 flex justify-between items-center hover:bg-slate-100/50 dark:hover:bg-slate-900/50 cursor-pointer shadow-sm transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shadow-md" style={{ backgroundColor: coin.color }}>
                                {coin.symbol}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-800 dark:text-white">{coin.name}</div>
                                <div className="text-[10px] font-bold text-slate-400">{coin.symbol}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-black font-mono text-xs text-slate-800 dark:text-white">
                                ${coin.price.toLocaleString()}
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPos ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {coin.change}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Market News Section using Search Grounding */}
                  <div className="w-full mt-6 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-1.5 text-sm">
                        <Newspaper className="w-4.5 h-4.5 text-blue-500" />
                        <span>{t('marketNews')}</span>
                      </h4>
                      <button
                        onClick={async () => {
                          try {
                            setLoadingNews(true);
                            const response = await fetch(`/api/market-news?lang=${lang}`);
                            if (response.ok) {
                              const data = await response.json();
                              if (data && Array.isArray(data.news)) {
                                setMarketNews(data.news);
                              }
                            }
                          } catch (err) {
                            console.error("Refresh error:", err);
                          } finally {
                            setLoadingNews(false);
                          }
                        }}
                        disabled={loadingNews}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingNews ? 'animate-spin text-blue-500' : ''}`} />
                      </button>
                    </div>

                    {loadingNews ? (
                      <div className="w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse">
                          {t('loadingNews')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {marketNews.length === 0 ? (
                          <div className="w-full p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 text-center text-xs font-bold text-slate-400">
                            {lang === 'ar' ? 'لا توجد أخبار حالياً' : 'No news available currently'}
                          </div>
                        ) : (
                          marketNews.map((item, idx) => (
                            <a
                              key={idx}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              referrerPolicy="no-referrer"
                              className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-4 flex flex-col gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer shadow-sm transition-all hover:-translate-y-0.5 text-left"
                              style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
                            >
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                                  {item.source}
                                </span>
                                <span className="font-mono text-[9px]">{item.time}</span>
                              </div>
                              <h5 className="font-black text-xs text-slate-800 dark:text-white leading-snug hover:text-blue-500 transition-colors">
                                {item.title}
                              </h5>
                              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 leading-normal mt-0.5">
                                {item.summary}
                              </p>
                            </a>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

              {/* TAB 2: MARKET (السوق) */}
              {activeTab === 'market' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">
                      EUR/USD & {t('market')}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 animate-pulse">
                      Live
                    </span>
                  </div>

                  {/* Real Interactive Chart component */}
                  <div className="mb-4">
                    <div className="flex gap-1.5 mb-2.5 overflow-x-auto scrollbar-none">
                      {['1', '5', '60', '120'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
                            timeframe === tf 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {tf === '1' ? '1m' : tf === '5' ? '5m' : tf === '60' ? '1h' : '2h'}
                        </button>
                      ))}
                    </div>
                    <InteractiveChart isDarkMode={isDarkMode} timeframe={timeframe} />
                  </div>

                  {/* Coins list with mini SVG Sparklines */}
                  <div className="mt-5">
                    <h3 className="font-black text-slate-800 dark:text-white text-sm mb-3">
                      Top 10 Crypto Spot Assets
                    </h3>

                    <div className="flex flex-col gap-2">
                      {coinsList.map((coin, index) => {
                        const isPos = coin.change.startsWith('+');
                        // Mini sparkline coordinate math
                        const spMin = Math.min(...coin.sparkline);
                        const spMax = Math.max(...coin.sparkline);
                        const spRange = spMax - spMin || 1;
                        const sparkPoints = coin.sparkline.map((val, idx) => {
                          const x = (idx / (coin.sparkline.length - 1)) * 60;
                          const y = 20 - ((val - spMin) / spRange) * 16;
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <div 
                            key={index} 
                            className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-3 flex justify-between items-center shadow-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-md" style={{ backgroundColor: coin.color }}>
                                {coin.symbol}
                              </div>
                              <div>
                                <div className="font-bold text-[12px] text-slate-800 dark:text-white leading-tight">{coin.name}</div>
                                <div className="text-[10px] font-bold text-slate-400">{coin.symbol}</div>
                              </div>
                            </div>

                            {/* Beautiful Sparkline vector diagram */}
                            <div className="w-[60px] h-5">
                              <svg className="w-full h-full overflow-visible">
                                <polyline
                                  fill="none"
                                  stroke={isPos ? '#22c55e' : '#ef4444'}
                                  strokeWidth="1.5"
                                  points={sparkPoints}
                                />
                              </svg>
                            </div>

                            <div className="text-right">
                              <div className="font-black font-mono text-[12px] text-slate-800 dark:text-white">
                                ${coin.price.toLocaleString()}
                              </div>
                              <span className={`text-[9px] font-bold ${isPos ? 'text-emerald-500' : 'text-red-500'}`}>
                                {coin.change}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: VIP (عروض VIP) */}
              {activeTab === 'vip' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  
                  {/* VIP Header card */}
                  <div className="w-full rounded-3xl bg-slate-900 text-white p-5 text-center shadow-xl mb-4 relative overflow-hidden">
                    <div className="absolute top-[-40%] left-[-20%] w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                    <Crown className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-bounce" />
                    <h2 className="text-xl font-black">{t('vipTitle')}</h2>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{t('vipSubtitle')}</p>
                  </div>

                  {/* VIP tiers list */}
                  <div className="flex flex-col gap-3">
                    {vipOffers.map((offer, idx) => {
                      const isSubscribed = profile?.vipPlanId === offer.id;
                      const dailyRate = ((offer.dailyProfit / offer.deposit) * 100).toFixed(0);

                      return (
                        <div 
                          key={offer.id}
                          className={`w-full rounded-2xl bg-white dark:bg-slate-900 border p-4 shadow-md relative overflow-hidden transition-all ${
                            offer.isHot 
                              ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/10 shadow-orange-500/5' 
                              : 'border-slate-100 dark:border-slate-900'
                          }`}
                        >
                          {offer.isHot && (
                            <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Hot</span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 mb-3.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                                {lang === 'ar' ? `عرض VIP ${idx + 1}` : lang === 'en' ? `VIP Package ${idx + 1}` : `Offre VIP ${idx + 1}`}
                              </h4>
                              <span className="text-[10px] font-bold text-slate-400">Duration: 30 Days</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-3.5">
                            <div className="bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-900">
                              <div className="text-[9px] font-bold text-slate-400 mb-0.5">{t('vipDeposit')}</div>
                              <div className="text-xs font-black text-slate-800 dark:text-white">${offer.deposit}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-900">
                              <div className="text-[9px] font-bold text-slate-400 mb-0.5">{t('vipDaily')} ({dailyRate}%)</div>
                              <div className="text-xs font-black text-slate-800 dark:text-white">${offer.dailyProfit.toFixed(2)}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-900">
                              <div className="text-[9px] font-bold text-slate-400 mb-0.5">{t('vipMonthly')}</div>
                              <div className="text-xs font-black text-slate-800 dark:text-white">${offer.monthlyProfit.toLocaleString()}</div>
                            </div>
                          </div>

                          {isSubscribed ? (
                            <button 
                              disabled 
                              className="w-full py-2.5 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-default"
                            >
                              <Check className="w-4 h-4" />
                              <span>{t('vipActive')}</span>
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleSubscribeVip(offer)}
                              disabled={loadingAction === `vip-${offer.id}`}
                              className={`w-full py-2.5 rounded-full font-bold text-xs active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-1 text-white ${
                                offer.isHot 
                                  ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/20' 
                                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/10'
                              }`}
                            >
                              {loadingAction === `vip-${offer.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Crown className="w-3.5 h-3.5" />
                              )}
                              <span>{t('vipSubscribe')}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: WALLET (المحفظة) */}
              {activeTab === 'wallet' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">
                      {t('wallet')}
                    </h2>
                  </div>

                  {/* Sub-tab navigation bar */}
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-4 pb-1">
                    {['overview', 'deposit', 'withdraw', 'transfer', 'history'].map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setWalletSubTab(sub as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          walletSubTab === sub 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-100 border border-slate-100 dark:border-slate-900'
                        }`}
                      >
                        {t(sub as any)}
                      </button>
                    ))}
                  </div>

                  {/* SUB-TAB: OVERVIEW (نظرة عامة) */}
                  {walletSubTab === 'overview' && (
                    <div className="flex flex-col gap-3">
                      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-5 shadow-sm">
                        <span className="text-slate-400 text-[11px] font-bold">{t('totalWallet')}</span>
                        <div className="text-3xl font-black font-mono text-slate-800 dark:text-white mt-1">
                          ${(profile?.balance || 0).toFixed(2)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-900">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400">{t('totalDeposits')}</span>
                            <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">
                              ${(profile?.totalDeposits || 0).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400">{t('todayProfit')}</span>
                            <div className="text-sm font-black text-emerald-500 mt-0.5">
                              +${(profile?.todayProfit || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                          <span className="text-slate-400 text-[10px] font-bold">{t('availableBalance')}</span>
                          <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                            ${(profile?.availableBalance || 0).toFixed(2)}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                          <span className="text-slate-400 text-[10px] font-bold">{t('frozenBalance')}</span>
                          <div className="text-lg font-black text-red-500 font-mono mt-0.5">
                            ${(profile?.frozenBalance || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB: DEPOSIT (إيداع) */}
                  {walletSubTab === 'deposit' && (
                    <div className="flex flex-col gap-3">
                      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-4 shadow-sm">
                        
                        {/* Network options */}
                        <div className="grid grid-cols-3 gap-1.5 mb-4">
                          {['trc20', 'bep20', 'erc20'].map((net) => (
                            <button
                              key={net}
                              onClick={() => setDepositNetwork(net)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                depositNetwork === net 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-900 text-slate-500'
                              }`}
                            >
                              {net.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        {/* Interactive QR code & Address fields */}
                        <div className="text-center p-3">
                          <div className="w-[150px] h-[150px] mx-auto bg-white border border-slate-100 p-1.5 rounded-xl mb-3 flex items-center justify-center">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(DEPOSIT_ADDRESSES[depositNetwork as keyof typeof DEPOSIT_ADDRESSES])}`}
                              alt="Deposit Address QR" 
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="text-[10px] font-black text-slate-400 mb-1">
                            {depositNetwork.toUpperCase()} Deposit Address
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 font-mono text-xs select-all break-all break-words leading-relaxed text-slate-700 dark:text-slate-300 flex justify-between items-center gap-2">
                            <span className="text-center w-full">{DEPOSIT_ADDRESSES[depositNetwork as keyof typeof DEPOSIT_ADDRESSES]}</span>
                            <button 
                              onClick={() => copyToClipboard(DEPOSIT_ADDRESSES[depositNetwork as keyof typeof DEPOSIT_ADDRESSES], 'deposit_address')}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            >
                              {copiedKey === 'deposit_address' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Direct Developer Simulator button to allow easy testing */}
                          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-900">
                            <p className="text-[11px] font-bold text-slate-400 mb-2">
                              Simulate instant simulated incoming payment of 500 USDT for testing:
                            </p>
                            <button 
                              onClick={handleSimulateAddFunds}
                              disabled={loadingAction === 'addFunds'}
                              className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                            >
                              {loadingAction === 'addFunds' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Coins className="w-4 h-4" />
                              )}
                              <span>Simulate Receive +500 USDT</span>
                            </button>
                          </div>

                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-600 flex gap-2.5 text-xs font-semibold leading-relaxed">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>{t('selectNetwork')}</span>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB: WITHDRAW (سحب) */}
                  {walletSubTab === 'withdraw' && (
                    <div className="flex flex-col gap-3">
                      <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-4 shadow-sm">
                        
                        <div className="grid grid-cols-3 gap-1.5 mb-4">
                          {['trc20', 'bep20', 'erc20'].map((net) => (
                            <button
                              key={net}
                              onClick={() => setWithdrawNetwork(net)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                withdrawNetwork === net 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-900 text-slate-500'
                              }`}
                            >
                              {net.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        <div className="mb-3.5">
                          <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                            {t('amount')}
                          </label>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-slate-800 dark:text-white font-bold font-mono text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                            Withdrawal {withdrawNetwork.toUpperCase()} Wallet Address
                          </label>
                          <input 
                            type="text" 
                            placeholder={withdrawNetwork === 'trc20' ? 'T...' : '0x...'}
                            value={withdrawAddress}
                            onChange={(e) => setWithdrawAddress(e.target.value)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-slate-800 dark:text-white font-bold font-mono text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                          />
                        </div>

                        <button 
                          onClick={handleWithdrawAction}
                          disabled={loadingAction === 'withdraw'}
                          className="w-full py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm cursor-pointer active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/15 flex items-center justify-center gap-1.5"
                        >
                          {loadingAction === 'withdraw' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowDownLeft className="w-4.5 h-4.5" />
                          )}
                          <span>{t('withdraw')}</span>
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-600 flex gap-2.5 text-xs font-semibold leading-relaxed">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>{t('withdrawWarning')}</span>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB: TRANSFER (تحويل) */}
                  {walletSubTab === 'transfer' && (
                    <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-4 shadow-sm">
                      <div className="mb-3">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          {t('recipient')}
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. user_8241"
                          value={transferRecipient}
                          onChange={(e) => setTransferRecipient(e.target.value)}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-slate-800 dark:text-white font-bold font-mono text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          {t('amount')}
                        </label>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-slate-800 dark:text-white font-bold font-mono text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                      </div>

                      <div className="mb-4.5">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          {t('password')}
                        </label>
                        <input 
                          type="password" 
                          placeholder="********"
                          value={transferPassword}
                          onChange={(e) => setTransferPassword(e.target.value)}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-slate-800 dark:text-white font-bold font-mono text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                        />
                      </div>

                      <button 
                        onClick={handleInternalTransfer}
                        disabled={loadingAction === 'transfer'}
                        className="w-full py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm cursor-pointer active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/15 flex items-center justify-center gap-1.5"
                      >
                        {loadingAction === 'transfer' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{t('transferAction')}</span>
                      </button>
                    </div>
                  )}

                  {/* SUB-TAB: HISTORY (سجل المعاملات) */}
                  {walletSubTab === 'history' && (
                    <div className="flex flex-col gap-2">
                      {transactions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold text-xs flex flex-col items-center gap-2">
                          <Activity className="w-8 h-8 opacity-40 text-slate-500" />
                          <span>{t('noTransactions')}</span>
                        </div>
                      ) : (
                        transactions.map((tx) => (
                          <div 
                            key={tx.id} 
                            className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-3.5 flex justify-between items-center"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-md ${
                                tx.type === 'deposit' 
                                  ? 'bg-emerald-500/10 text-emerald-500' 
                                  : tx.type === 'withdraw' 
                                  ? 'bg-red-500/10 text-red-500' 
                                  : tx.type === 'transfer_out'
                                  ? 'bg-purple-500/10 text-purple-500'
                                  : 'bg-blue-500/10 text-blue-500'
                              }`}>
                                {tx.type === 'deposit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-bold text-xs text-slate-800 dark:text-white capitalize">
                                  {tx.type.replace('_', ' ')}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">
                                  {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-black font-mono text-xs text-slate-800 dark:text-white">
                                ${tx.amount.toFixed(2)}
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                tx.status === 'completed' 
                                  ? 'bg-emerald-500/10 text-emerald-500' 
                                  : tx.status === 'pending' 
                                  ? 'bg-amber-500/10 text-amber-500' 
                                  : 'bg-red-500/10 text-red-500'
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </motion.div>
              )}

              {/* TAB 5: ADMIN / SETTINGS (إدارة / الإعدادات) */}
              {activeTab === 'admin' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  
                  {/* Header Profile Section */}
                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 p-4 shadow-sm mb-4">
                    <div className="text-lg font-black text-slate-800 dark:text-white">
                      {profile ? `${profile.firstName} ${profile.lastName}` : '...'}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                      {lang === 'ar' ? 'عميل مميز' : lang === 'en' ? 'Premium Client' : 'Client Premium'}
                    </div>
                  </div>

                  {/* Settings Menu List */}
                  <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-900 shadow-sm">
                    
                    <button 
                      onClick={() => setActiveModal('personal')}
                      className="w-full flex justify-between items-center p-4 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-900 text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-blue-500" />
                        <span className="text-xs font-bold">{t('personalEpisode')}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>

                    <button 
                      onClick={() => {
                        setWalletSubTab('history');
                        setActiveTab('wallet');
                      }}
                      className="w-full flex justify-between items-center p-4 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-900 text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-blue-500" />
                        <span className="text-xs font-bold">{t('notifications')}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>

                    <button 
                      onClick={() => setActiveModal('support')}
                      className="w-full flex justify-between items-center p-4 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-900 text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Headset className="w-5 h-5 text-blue-500" />
                        <span className="text-xs font-bold">{t('support')}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>

                    <button 
                      onClick={() => setActiveModal('legal')}
                      className="w-full flex justify-between items-center p-4 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-900 text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <span className="text-xs font-bold">{t('legal')}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Dark Mode Switch */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-900">
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                        {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
                        <span className="text-xs font-bold">{t('darkMode')}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isDarkMode} 
                          onChange={(e) => {
                            setIsDarkMode(e.target.checked);
                            localStorage.setItem('pocket24_dark_mode', e.target.checked ? 'true' : 'false');
                          }}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>

                  </div>

                  {/* Logout Button */}
                  <button 
                    onClick={handleSignOut}
                    className="w-full mt-4 flex items-center gap-3 justify-center py-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 font-bold text-xs rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('logout')}</span>
                  </button>

                </motion.div>
              )}
            </div>
          )}

        </div>

        {/* Global Bottom Tab navigation bar (Only visible when user is logged in) */}
        {user && (
          <div id="bottomNav" className="absolute bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-slate-950/92 backdrop-blur-md border-t border-slate-200 dark:border-slate-900 flex justify-around items-center px-4 py-2 z-50">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeTab === 'home' ? 'text-blue-600 font-black' : 'text-slate-400 font-bold'}`}
            >
              <Home className="w-5.5 h-5.5" />
              <span className="text-[10px]">{t('home')}</span>
            </button>

            <button 
              onClick={() => setActiveTab('market')}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeTab === 'market' ? 'text-blue-600 font-black' : 'text-slate-400 font-bold'}`}
            >
              <TrendingUp className="w-5.5 h-5.5" />
              <span className="text-[10px]">{t('market')}</span>
            </button>

            <button 
              onClick={() => setActiveTab('vip')}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeTab === 'vip' ? 'text-blue-600 font-black' : 'text-slate-400 font-bold'}`}
            >
              <Crown className="w-5.5 h-5.5" />
              <span className="text-[10px]">VIP</span>
            </button>

            <button 
              onClick={() => setActiveTab('wallet')}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeTab === 'wallet' ? 'text-blue-600 font-black' : 'text-slate-400 font-bold'}`}
            >
              <Wallet className="w-5.5 h-5.5" />
              <span className="text-[10px]">{t('wallet')}</span>
            </button>

            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${activeTab === 'admin' ? 'text-blue-600 font-black' : 'text-slate-400 font-bold'}`}
            >
              <Settings className="w-5.5 h-5.5" />
              <span className="text-[10px]">{t('admin')}</span>
            </button>
          </div>
        )}

        {/* ==================== SLIDING SHEETS / MODAL POPUPS ==================== */}
        
        {/* MODAL 1: AUTHENTICATION (EMAIL/PASSWORD) */}
        <AnimatePresence>
          {activeModal === 'auth' && (
            <div className="absolute inset-0 bg-black/60 z-[100] flex items-end justify-center">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] border-t border-slate-100 dark:border-slate-800 p-5 pb-8 max-h-[90%] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setActiveModal(null)} />
                
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {isSignUp ? t('createAccount') : t('welcomeBack')}
                  </h2>
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-lg cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={isSignUp ? handleEmailSignUp : handleEmailLogin}>
                  {isSignUp && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('firstName')}</label>
                        <input 
                          type="text" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)} 
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs outline-none focus:border-blue-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('lastName')}</label>
                        <input 
                          type="text" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)} 
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs outline-none focus:border-blue-500" 
                        />
                      </div>
                    </div>
                  )}

                  {isSignUp && (
                    <div className="mb-3">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('username')}</label>
                      <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs outline-none focus:border-blue-500" 
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('email')}</label>
                    <input 
                      type="email" 
                      placeholder="example@mail.com"
                      value={authEmail} 
                      onChange={(e) => setAuthEmail(e.target.value)} 
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('password')}</label>
                    <input 
                      type="password" 
                      placeholder="********"
                      value={authPassword} 
                      onChange={(e) => setAuthPassword(e.target.value)} 
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs outline-none focus:border-blue-500" 
                    />
                  </div>

                  {isSignUp && (
                    <div className="mb-4.5">
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">{t('inviteCode')}</label>
                      <input 
                        type="text" 
                        value={inviteCode} 
                        onChange={(e) => setInviteCode(e.target.value)} 
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white font-bold text-xs outline-none focus:border-blue-500" 
                      />
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loadingAction === 'login' || loadingAction === 'signup'}
                    className="w-full py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm cursor-pointer shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
                  >
                    {loadingAction === 'login' || loadingAction === 'signup' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    <span>{isSignUp ? t('signup') : t('login')}</span>
                  </button>
                </form>

                <div className="mt-5 text-center text-xs text-slate-400 font-bold">
                  {isSignUp ? (
                    <div>
                      <span>{t('haveAccount')}</span>{' '}
                      <span onClick={() => setIsSignUp(false)} className="text-blue-500 hover:underline cursor-pointer">{t('login')}</span>
                    </div>
                  ) : (
                    <div>
                      <span>{t('noAccount')}</span>{' '}
                      <span onClick={() => setIsSignUp(true)} className="text-blue-500 hover:underline cursor-pointer">{t('signup')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-4 justify-center text-xs font-bold text-blue-500/80">
                  <span onClick={() => { setActiveModal(null); handleGoogleSignIn(); }} className="hover:underline cursor-pointer">
                    {t('googleLogin')}
                  </span>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 2: INVITE FRIENDS (دعوة الأصدقاء) */}
        <AnimatePresence>
          {activeModal === 'invite' && (
            <div className="absolute inset-0 bg-black/60 z-[100] flex items-end justify-center">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] border-t border-slate-100 dark:border-slate-800 p-5 pb-8 max-h-[90%] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setActiveModal(null)} />
                
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {t('inviteFriends')}
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-lg cursor-pointer">
                    &times;
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5">{t('referralLink')}</label>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 text-xs font-mono text-slate-700 dark:text-slate-300 flex justify-between items-center gap-2">
                    <span className="truncate">{profile?.referralLink || '...'}</span>
                    <button 
                      onClick={() => copyToClipboard(profile?.referralLink || '', 'ref_link')}
                      className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    >
                      {copiedKey === 'ref_link' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5">{t('referralCode')}</label>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 text-xs font-mono text-slate-700 dark:text-slate-300 flex justify-between items-center gap-2">
                    <span className="font-black tracking-widest">{profile?.referralCode || '...'}</span>
                    <button 
                      onClick={() => copyToClipboard(profile?.referralCode || '', 'ref_code')}
                      className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    >
                      {copiedKey === 'ref_code' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 text-center">
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400">0</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{t('totalReferrals')}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 text-center">
                    <div className="text-3xl font-black text-blue-600 dark:text-blue-400">$0.00</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{t('totalRewards')}</div>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 3: PERSONAL EPISODE (الحلقة الشخصية) */}
        <AnimatePresence>
          {activeModal === 'personal' && (
            <div className="absolute inset-0 bg-black/60 z-[100] flex items-end justify-center">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] border-t border-slate-100 dark:border-slate-800 p-5 pb-8 max-h-[90%] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setActiveModal(null)} />
                
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {t('personalEpisode')}
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-lg cursor-pointer">
                    &times;
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">{t('username')}</div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{profile?.username}</span>
                      <button 
                        onClick={() => copyToClipboard(profile?.username || '', 'username')}
                        className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        {copiedKey === 'username' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">ID (معرف المستخدم)</div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{profile?.userId}</span>
                      <button 
                        onClick={() => copyToClipboard(profile?.userId || '', 'userid')}
                        className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                      >
                        {copiedKey === 'userid' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">{t('email')}</div>
                    <div className="font-bold text-slate-800 dark:text-white text-sm">{profile?.email}</div>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 4: TECHNICAL SUPPORT (الدعم الفني) */}
        <AnimatePresence>
          {activeModal === 'support' && (
            <div className="absolute inset-0 bg-black/60 z-[100] flex items-end justify-center">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] border-t border-slate-100 dark:border-slate-800 p-5 pb-8 max-h-[90%] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setActiveModal(null)} />
                
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {t('support')}
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-lg cursor-pointer">
                    &times;
                  </button>
                </div>

                <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium space-y-3">
                  <p>يمكنك التواصل مع فريق الدعم الفني المخصص على مدار الساعة لحل أي مشاكل فنية أو استفسارات:</p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl">
                    <div className="font-bold text-xs text-slate-400 mb-1">البريد الإلكتروني المباشر</div>
                    <div className="font-black text-blue-600 dark:text-blue-400 font-mono text-sm">support@pocket24.com</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-xl">
                    <div className="font-bold text-xs text-slate-400 mb-1">رابط التليجرام الرسمي المباشر</div>
                    <div className="font-black text-blue-600 dark:text-blue-400 font-mono text-sm">@Pocket24_Support</div>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL 5: LEGAL TERMS & AGREEMENTS (الشروط والأحكام) */}
        <AnimatePresence>
          {activeModal === 'legal' && (
            <div className="absolute inset-0 bg-black/60 z-[100] flex items-end justify-center">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-full bg-white dark:bg-slate-900 rounded-t-[28px] border-t border-slate-100 dark:border-slate-800 p-5 pb-8 max-h-[90%] overflow-y-auto"
              >
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setActiveModal(null)} />
                
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {t('legal')}
                  </h2>
                  <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-lg cursor-pointer">
                    &times;
                  </button>
                </div>

                <div className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed space-y-3.5 max-h-[350px] overflow-y-auto p-1 font-semibold">
                  <p><strong>1- شروط عامة:</strong> تعمل منصة Pocket24 كوسيط آمن لتداول العقود الآجلة للأصول الرقمية والعملات الأجنبية (فوركس).</p>
                  <p><strong>2- إدارة المخاطر:</strong> ينطوي تداول الأصول الرقمية على مخاطر مالية عالية. تفعيل خطط الـ VIP والاشتراكات يخضع للشروط التنظيمية الداخلية للشركة.</p>
                  <p><strong>3- السياسات المالية:</strong> تتم جميع عمليات السحب والإيداع عبر عناوين سلاسل الكتل اللامركزية للتأكيد السريع. الحد الأدنى للإيداع هو 50 USDT.</p>
                  <p><strong>4- الأمان والخصوصية:</strong> نحن نقوم بتشفير كامل بيانات المستخدمين والمعاملات لضمان أعلى معايير الخصوصية الممكنة.</p>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================== GLOBAL TOAST MESSAGE POPUP ==================== */}
        <AnimatePresence>
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[88%] flex justify-center pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="bg-slate-900/95 dark:bg-slate-950/95 border border-blue-500/30 text-white rounded-full px-5 py-3 shadow-2xl text-center text-xs font-bold leading-snug"
              >
                {toastMessage}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

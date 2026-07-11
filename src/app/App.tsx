import { useEffect, useState, useRef } from "react";
import {
  ShoppingCart, Menu, X, Phone, Mail, MapPin,
  Package, Wrench, FileText, Settings,
  Users, BarChart3, LogOut, Plus, Trash2, Pencil,
  Upload, Eye, ArrowLeft, CreditCard, Lock, Check,
  Search, Shield, Clock, Star, Calendar,
  ChevronDown, ChevronRight, User, TrendingUp,
  CheckCircle, Leaf, AlertCircle, EyeOff
} from "lucide-react";

type Page = "home" | "shop" | "repairs" | "buyback" | "blog" | "post" | "admin" | "checkout";
type AdminSection = "overview" | "products" | "blog-mgmt" | "orders" | "users";
type UserRole = "admin" | "user" | "invité";
type PartCondition = "Neuf" | "Très bon état" | "Bon état" | "Reconditionné";
type OrderStatus = "en_attente" | "en_cours" | "expédié" | "livré";
type CheckoutStep = "cart" | "info" | "payment" | "success";

interface Part {
  id: string; name: string; price: number; category: string;
  condition: PartCondition; image: string; description: string;
  stock: number; createdAt: string;
}
interface CartItem { part: Part; qty: number; }
interface BlogPost {
  id: string; title: string; excerpt: string; content: string;
  image: string; date: string; category: string; author: string; readTime: number;
}
interface Account {
  id: string; name: string; email: string;
  role: UserRole; createdAt: string;
}
interface Order {
  id: string; customerName: string; customerEmail: string;
  items: CartItem[]; total: number; status: OrderStatus; date: string;
}

// Aucun identifiant ni mot de passe ne doit être stocké dans le frontend.

const INITIAL_PARTS: Part[] = [
  { id: "p1", name: "Carburateur Husqvarna 135 Mark II", price: 45, category: "Moteur", condition: "Bon état", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=280&fit=crop&auto=format", description: "Carburateur d'occasion testé et fonctionnel. Compatible Husqvarna 135 et 140.", stock: 2, createdAt: "2024-06-01" },
  { id: "p2", name: "Lame de tondeuse universelle 46cm", price: 18, category: "Coupe", condition: "Très bon état", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=280&fit=crop&auto=format", description: "Lame peu usée. Épaisseur 3mm, longueur 46cm. Alésage 25,4mm.", stock: 5, createdAt: "2024-06-05" },
  { id: "p3", name: "Filtre à air Honda GCV160", price: 8, category: "Filtration", condition: "Neuf", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=280&fit=crop&auto=format", description: "Filtre à air neuf déstocké. Compatible Honda GCV160 et GCV170.", stock: 10, createdAt: "2024-06-08" },
  { id: "p4", name: "Bobine d'allumage Stihl MS250", price: 55, category: "Allumage", condition: "Reconditionné", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop&auto=format", description: "Bobine reconditionnée, garantie 3 mois. Compatible Stihl MS230 et MS250.", stock: 1, createdAt: "2024-06-10" },
  { id: "p5", name: "Courroie de transmission tondeuse", price: 22, category: "Transmission", condition: "Neuf", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=280&fit=crop&auto=format", description: "Courroie neuve, longueur 95cm. Convient à de nombreux modèles autoportés.", stock: 8, createdAt: "2024-06-12" },
  { id: "p6", name: "Plateau de coupe 46cm complet", price: 85, category: "Coupe", condition: "Bon état", image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=280&fit=crop&auto=format", description: "Plateau complet avec lame, axe et palier. Légère usure esthétique, mécaniquement parfait.", stock: 1, createdAt: "2024-06-15" },
  { id: "p7", name: "Câble de traction autoportée", price: 15, category: "Transmission", condition: "Bon état", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=280&fit=crop&auto=format", description: "Câble d'origine légèrement utilisé. Longueur 1,2m, compatible nombreuses marques.", stock: 4, createdAt: "2024-06-18" },
  { id: "p8", name: "Carburateur Briggs & Stratton 450E", price: 38, category: "Moteur", condition: "Reconditionné", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop&auto=format", description: "Démonté, nettoyé et remonté. Gicleur neuf. Garantie 3 mois.", stock: 2, createdAt: "2024-06-20" },
];

const INITIAL_POSTS: BlogPost[] = [
  {
    id: "b1", title: "Entretien de printemps : préparez votre tondeuse pour la saison",
    excerpt: "Avec l'arrivée des beaux jours, il est temps de sortir la tondeuse du garage. Voici les vérifications essentielles à effectuer avant la première tonte.",
    content: "L'entretien de printemps est une étape cruciale pour garantir le bon fonctionnement de votre tondeuse toute la saison. Après plusieurs mois de stockage, certains éléments nécessitent une attention particulière.\n\nContrôle de l'huile moteur\nCommencez par vérifier le niveau d'huile et son aspect. Une huile sombre et visqueuse doit être remplacée. Utilisez une huile SAE 30 ou 10W-30 pour la plupart des moteurs 4 temps.\n\nNettoyage du filtre à air\nLe filtre à air est souvent négligé alors qu'il joue un rôle essentiel. Un filtre encrassé provoque une consommation excessive d'essence et réduit les performances. Remplacez-le si nécessaire.\n\nVérification de la bougie\nLa bougie d'allumage doit être inspectée visuellement. Une électrode érodée ou encrassée doit être remplacée. Le prix d'une bougie (3–8€) est dérisoire comparé aux problèmes qu'une mauvaise bougie peut causer.\n\nÉtat de la lame\nUne lame émoussée déchire l'herbe au lieu de la couper nettement, favorisant les maladies du gazon. Affûtez ou remplacez la lame chaque printemps. Respectez toujours les consignes de sécurité lors de cette opération.\n\nEn cas de doute, n'hésitez pas à confier votre matériel à notre atelier pour une révision complète.",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=450&fit=crop&auto=format",
    date: "2024-03-15", category: "Entretien", author: "Équipe Do' Motoculture", readTime: 5,
  },
  {
    id: "b2", title: "Comment choisir une pièce d'occasion de qualité ?",
    excerpt: "Acheter une pièce d'occasion peut être une excellente option économique, à condition de savoir quels critères évaluer. Nos experts vous guident.",
    content: "Le marché des pièces d'occasion pour motoculture offre de réelles opportunités d'économies, mais certaines précautions s'imposent pour éviter les mauvaises surprises.\n\nL'état visuel\nInspectez soigneusement la pièce à la recherche de fissures, corrosion excessive, ou déformations. Une légère usure ou quelques traces d'utilisation sont normales et ne compromettent pas le fonctionnement.\n\nLa traçabilité\nPrivilégiez les pièces dont vous connaissez la provenance. Chez Do' Motoculture, chaque pièce est issue de matériels connus, démontés dans notre atelier.\n\nLa compatibilité\nAvant d'acheter, assurez-vous que la référence correspond bien à votre modèle. Le numéro de série de votre matériel est votre meilleur allié.\n\nNotre engagement qualité\nChaque pièce vendue est testée et contrôlée avant mise en vente. Nous indiquons honnêtement l'état réel de chaque pièce. Économisez jusqu'à 70% par rapport au prix du neuf.",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=450&fit=crop&auto=format",
    date: "2024-04-02", category: "Conseils", author: "Équipe Do' Motoculture", readTime: 4,
  },
  {
    id: "b3", title: "Tronçonneuse : les signes qui indiquent une révision urgente",
    excerpt: "Une tronçonneuse mal entretenue est dangereuse. Découvrez les symptômes qui doivent vous alerter et vous pousser à consulter un professionnel.",
    content: "La tronçonneuse est l'un des outils les plus dangereux du jardin. Un entretien régulier n'est pas optionnel — c'est une question de sécurité.\n\nDémarrage difficile ou impossible\nSi votre tronçonneuse ne démarre plus facilement malgré un carburant frais, il peut s'agir d'un problème de carburateur, de bougie ou de compression. Ne forcez pas sur le lanceur au risque d'endommager la corde.\n\nMoteur qui cale au ralenti\nUn moteur qui cale dès qu'on relâche la gâchette indique souvent un carburateur encrassé ou mal réglé.\n\nChaîne qui saute ou ne coupe plus\nUne chaîne émoussée ou mal tendue est dangereuse. L'affûtage doit être effectué régulièrement (toutes les 2–3 heures d'utilisation).\n\nVibrations excessives\nDes vibrations anormales peuvent indiquer un problème d'anti-vibration usé. Cessez immédiatement l'utilisation et apportez votre machine à notre atelier pour un diagnostic gratuit.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=450&fit=crop&auto=format",
    date: "2024-05-20", category: "Sécurité", author: "Équipe Do' Motoculture", readTime: 6,
  },
];

const INITIAL_ORDERS: Order[] = [
  { id: "CMD-001", customerName: "Jean-Pierre Martin", customerEmail: "jp.martin@email.fr", items: [{ part: INITIAL_PARTS[0], qty: 1 }], total: 45, status: "livré", date: "2024-06-10" },
  { id: "CMD-002", customerName: "Sophie Dubois", customerEmail: "s.dubois@email.fr", items: [{ part: INITIAL_PARTS[1], qty: 2 }, { part: INITIAL_PARTS[2], qty: 1 }], total: 44, status: "expédié", date: "2024-06-18" },
  { id: "CMD-003", customerName: "Michel Fontaine", customerEmail: "m.fontaine@email.fr", items: [{ part: INITIAL_PARTS[3], qty: 1 }], total: 55, status: "en_cours", date: "2024-06-22" },
];

const PACKAGES = [
  { id: "r1", name: "Révision Express", price: 49, duration: "24–48h", description: "L'essentiel pour repartir rapidement. Idéal pour un entretien de routine.", services: ["Diagnostic complet", "Nettoyage filtre à air", "Nettoyage carburateur", "Vérification et réglage lame", "Contrôle niveau huile", "Test fonctionnel final"], popular: false },
  { id: "r2", name: "Révision Complète", price: 99, duration: "2–3 jours", description: "La révision recommandée chaque saison pour un matériel en parfait état.", services: ["Tout le forfait Express", "Vidange moteur", "Remplacement bougie", "Réglage carburateur", "Affûtage ou remplacement lame", "Contrôle transmission", "Rapport d'intervention détaillé"], popular: true },
  { id: "r3", name: "Remise en État", price: 179, duration: "5–7 jours", description: "Pour redonner une seconde vie à un matériel négligé ou en panne.", services: ["Tout le forfait Complet", "Démontage complet", "Nettoyage ultrason carburateur", "Remplacement pièces d'usure", "Garantie 3 mois révision", "Rapport photos avant/après"], popular: false },
  { id: "r4", name: "Forfait Tronçonneuse", price: 79, duration: "48h", description: "Révision spécialisée pour tronçonneuses thermiques toutes marques.", services: ["Diagnostic complet", "Nettoyage carburateur", "Réglage ralenti et plein gaz", "Vérification circuit huileur", "Affûtage chaîne", "Test de sécurité complet"], popular: false },
];

const CATEGORIES = ["Tous", "Moteur", "Coupe", "Filtration", "Allumage", "Transmission"];

const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " €";
const conditionColor: Record<PartCondition, string> = {
  "Neuf": "bg-blue-100 text-blue-800",
  "Très bon état": "bg-green-100 text-green-800",
  "Bon état": "bg-yellow-100 text-yellow-700",
  "Reconditionné": "bg-orange-100 text-orange-700",
};
const statusLabel: Record<OrderStatus, string> = { en_attente: "En attente", en_cours: "En cours", expédié: "Expédié", livré: "Livré" };
const statusColor: Record<OrderStatus, string> = { en_attente: "bg-yellow-100 text-yellow-800", en_cours: "bg-blue-100 text-blue-800", expédié: "bg-purple-100 text-purple-800", livré: "bg-green-100 text-green-800" };

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [postId, setPostId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "", address: "", city: "", zip: "" });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentUser, setCurrentUser] = useState<Account | null>(null);
  const [adminSection, setAdminSection] = useState<AdminSection>("overview");
  const [parts, setParts] = useState<Part[]>(INITIAL_PARTS);
  const [posts, setPosts] = useState<BlogPost[]>(INITIAL_POSTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [showAddPart, setShowAddPart] = useState(false);
  const [newPart, setNewPart] = useState<Partial<Part>>({ name: "", price: 0, category: "Moteur", condition: "Bon état", description: "", stock: 1, image: "" });
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" as UserRole });

  const [showAddPost, setShowAddPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", excerpt: "", content: "", category: "Conseils", image: "" });

  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [contactSent, setContactSent] = useState(false);
  const [buybackForm, setBuybackForm] = useState({ name: "", email: "", phone: "", equipment: "", brandModel: "", condition: "", desiredPrice: "", description: "" });
  const [buybackSent, setBuybackSent] = useState(false);
  const [buybackError, setBuybackError] = useState("");
  const [buybackLoading, setBuybackLoading] = useState(false);

  const cartTotal = cart.reduce((s, i) => s + i.part.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = (part: Part) => {
    setCart(prev => {
      const ex = prev.find(i => i.part.id === part.id);
      if (ex) return prev.map(i => i.part.id === part.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { part, qty: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.part.id !== id));
  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return removeFromCart(id);
    setCart(prev => prev.map(i => i.part.id === id ? { ...i, qty } : i));
  };

  const navigate = (p: Page) => { setPage(p); setMenuOpen(false); window.scrollTo(0, 0); };

  useEffect(() => {
    fetch("/api/products").then(r => r.ok ? r.json() : Promise.reject()).then(setParts).catch(() => {});
    fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? r.json() : null).then(user => user && setCurrentUser(user)).catch(() => {});
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connexion impossible.");
      setCurrentUser(data);
      setAdminSection("overview");
      const [usersResponse, ordersResponse] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/orders", { credentials: "include" }),
      ]);
      if (usersResponse.ok) setAccounts(await usersResponse.json());
      if (ordersResponse.ok) setOrders(await ordersResponse.json());
    } catch (error) { setLoginError(error instanceof Error ? error.message : "Connexion impossible."); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setCurrentUser(null); setAccounts([]); setLoginEmail(""); setLoginPassword("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setNewPart(p => ({ ...p, image: url }));
    }
  };

  const savePart = async () => {
    if (!newPart.name || !newPart.price) return;
    const method = editingPartId ? "PUT" : "POST";
    const url = editingPartId ? `/api/admin/products/${editingPartId}` : "/api/admin/products";
    const response = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPart) });
    const data = await response.json();
    if (!response.ok) { alert(data.error || "Enregistrement impossible."); return; }
    setParts(prev => editingPartId ? prev.map(p => p.id === editingPartId ? data : p) : [data, ...prev]);
    setEditingPartId(null); setNewPart({ name: "", price: 0, category: "Moteur", condition: "Bon état", description: "", stock: 1, image: "" }); setShowAddPart(false);
  };

  const editPart = (p: Part) => { setNewPart({ ...p }); setEditingPartId(p.id); setShowAddPart(true); };
  const deletePart = async (id: string) => { const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE", credentials: "include" }); if (response.ok) setParts(prev => prev.filter(p => p.id !== id)); };

  const saveUser = async () => {
    if (!newUser.name || !newUser.email || newUser.password.length < 12) return;
    const response = await fetch("/api/admin/users", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newUser) });
    const data = await response.json();
    if (!response.ok) { alert(data.error || "Création impossible."); return; }
    setAccounts(prev => [...prev, data]);
    setNewUser({ name: "", email: "", password: "", role: "user" }); setShowAddUser(false);
  };

  const savePost = () => {
    if (!newPost.title || !newPost.content) return;
    const p: BlogPost = {
      id: `b${Date.now()}`, title: newPost.title,
      excerpt: newPost.excerpt || newPost.content.slice(0, 120) + "...",
      content: newPost.content,
      image: newPost.image || "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=450&fit=crop&auto=format",
      date: new Date().toISOString().split("T")[0], category: newPost.category,
      author: currentUser?.name || "Admin", readTime: Math.max(1, Math.ceil(newPost.content.length / 800)),
    };
    setPosts(prev => [p, ...prev]);
    setNewPost({ title: "", excerpt: "", content: "", category: "Conseils", image: "" });
    setShowAddPost(false);
  };

  const submitPayment = async () => {
    setPaymentLoading(true);
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: customerInfo, items: cart.map(item => ({ productId: item.part.id, quantity: item.qty })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Paiement indisponible.");
      window.location.assign(data.url);
    } catch (error) { alert(error instanceof Error ? error.message : "Paiement indisponible."); }
    finally { setPaymentLoading(false); }
  };

  const submitBuyback = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuybackError("");
    setBuybackLoading(true);
    try {
      const response = await fetch("/api/buyback-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buybackForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Envoi impossible.");
      setBuybackSent(true);
      setBuybackForm({ name: "", email: "", phone: "", equipment: "", brandModel: "", condition: "", desiredPrice: "", description: "" });
    } catch (error) {
      setBuybackError(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setBuybackLoading(false);
    }
  };

  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSent(true);
    setContactForm({ name: "", email: "", phone: "", subject: "", message: "" });
    setTimeout(() => setContactSent(false), 5000);
  };

  const filteredParts = parts.filter(p => {
    const matchCat = categoryFilter === "Tous" || p.category === categoryFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });


  // ─── NAVBAR ──────────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => navigate("home")} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A5C1A] flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl text-white tracking-wide">DO' MOTOCULTURE</span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {([
              { label: "Accueil", p: "home" as Page },
              { label: "Boutique", p: "shop" as Page },
              { label: "Réparations", p: "repairs" as Page },
              { label: "Rachat matériel", p: "buyback" as Page },
              { label: "Blog", p: "blog" as Page },
            ] as { label: string; p: Page }[]).map(({ label, p }) => (
              <button key={p} onClick={() => navigate(p)}
                className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors ${page === p ? "text-[#4CAF50] border-b-2 border-[#4CAF50]" : "text-white/80 hover:text-white"}`}
                style={{ fontFamily: "'Barlow', sans-serif" }}>
                {label}
              </button>
            ))}
            <button onClick={() => navigate("admin")} className="ml-2 px-4 py-2 text-sm font-medium text-white/50 hover:text-white/80 transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
              Admin
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setCartOpen(true)} className="relative p-2 text-white hover:text-[#4CAF50] transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#1A5C1A] text-white text-xs w-5 h-5 flex items-center justify-center font-bold rounded-none">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-white">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-black border-t border-white/10">
          {([
            { label: "Accueil", p: "home" as Page },
            { label: "Boutique", p: "shop" as Page },
            { label: "Réparations", p: "repairs" as Page },
            { label: "Rachat matériel", p: "buyback" as Page },
            { label: "Blog", p: "blog" as Page },
            { label: "Admin", p: "admin" as Page },
          ] as { label: string; p: Page }[]).map(({ label, p }) => (
            <button key={p} onClick={() => navigate(p)}
              className="block w-full text-left px-6 py-3 text-white/80 hover:text-white hover:bg-white/5 font-medium"
              style={{ fontFamily: "'Barlow', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );

  // ─── CART SIDEBAR ─────────────────────────────────────────────────────────────
  const CartSidebar = () => (
    <>
      {cartOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setCartOpen(false)} />}
      <div className={`fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white z-50 transform transition-transform duration-300 ${cartOpen ? "translate-x-0" : "translate-x-full"} flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between px-5 py-4 bg-black text-white">
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl tracking-wide">PANIER ({cartCount})</h2>
          <button onClick={() => setCartOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
            <ShoppingCart className="w-12 h-12" />
            <p style={{ fontFamily: "'Barlow', sans-serif" }}>Votre panier est vide</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.part.id} className="flex gap-3 p-3 border border-gray-200 bg-gray-50">
                  <img src={item.part.image} alt={item.part.name} className="w-16 h-14 object-cover bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 line-clamp-2" style={{ fontFamily: "'Barlow', sans-serif" }}>{item.part.name}</p>
                    <p className="font-medium text-sm text-[#1A5C1A] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.part.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQty(item.part.id, item.qty - 1)} className="w-6 h-6 bg-gray-200 flex items-center justify-center text-sm hover:bg-gray-300 transition-colors leading-none">−</button>
                      <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.part.id, item.qty + 1)} className="w-6 h-6 bg-gray-200 flex items-center justify-center text-sm hover:bg-gray-300 transition-colors leading-none">+</button>
                      <button onClick={() => removeFromCart(item.part.id)} className="ml-auto text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-600" style={{ fontFamily: "'Barlow', sans-serif" }}>Total</span>
                <span className="font-bold text-xl text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(cartTotal)}</span>
              </div>
              <button onClick={() => { setCartOpen(false); setCheckoutStep("cart"); navigate("checkout"); }}
                className="w-full bg-[#1A5C1A] text-white py-3 font-semibold tracking-wide hover:bg-[#2D7A2D] transition-colors flex items-center justify-center gap-2"
                style={{ fontFamily: "'Barlow', sans-serif" }}>
                <CreditCard className="w-4 h-4" />
                PROCÉDER AU PAIEMENT
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );

  // ─── HOME PAGE ────────────────────────────────────────────────────────────────
  const HomePage = () => (
    <div>
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden bg-black">
        <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&h=900&fit=crop&auto=format" alt="Jardinage et motoculture" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/90" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#1A5C1A]/80 px-4 py-1.5 mb-6">
            <Leaf className="w-3.5 h-3.5 text-[#4CAF50]" />
            <span className="text-xs text-[#4CAF50] font-semibold tracking-[0.2em] uppercase" style={{ fontFamily: "'Barlow', sans-serif" }}>Réparation & Pièces d'Occasion</span>
          </div>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-6xl md:text-8xl text-white leading-none tracking-tight mb-6">
            DO'<br /><span className="text-[#4CAF50]">MOTOCULTURE</span>
          </h1>
          <p className="text-lg md:text-xl text-white/75 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>
            Votre spécialiste en réparation de matériel de motoculture et revente de pièces d'occasion de qualité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate("shop")} className="bg-[#1A5C1A] text-white px-8 py-3.5 font-semibold tracking-wide hover:bg-[#2D7A2D] transition-colors flex items-center justify-center gap-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
              <Package className="w-4 h-4" /> VOIR LES PIÈCES
            </button>
            <button onClick={() => navigate("repairs")} className="border-2 border-white text-white px-8 py-3.5 font-semibold tracking-wide hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
              <Wrench className="w-4 h-4" /> NOS FORFAITS
            </button>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/40" />
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#1A5C1A] py-8">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-3 divide-x divide-white/20">
          {[
            { n: "10+", label: "Ans d'expérience" },
            { n: "2 000+", label: "Machines réparées" },
            { n: "500+", label: "Pièces en stock" },
          ].map(({ n, label }) => (
            <div key={label} className="text-center py-2">
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-3xl md:text-5xl text-white">{n}</div>
              <div className="text-sm text-white/65 mt-1" style={{ fontFamily: "'Barlow', sans-serif" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-[#1A5C1A] z-0" />
            <img src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600&h=500&fit=crop&auto=format" alt="Notre atelier" className="relative z-10 w-full object-cover bg-gray-200" style={{ aspectRatio: "4/3" }} />
          </div>
          <div>
            <span className="text-xs text-[#1A5C1A] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>À propos</span>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-4xl md:text-5xl text-black mt-2 mb-6 leading-tight">
              VOTRE SPÉCIALISTE<br />MOTOCULTURE LOCAL
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>
              Depuis plus de 10 ans, Do' Motoculture est votre partenaire de confiance pour l'entretien et la réparation de tous vos équipements de jardin : tondeuses, tronçonneuses, débroussailleuses, souffleurs et bien plus encore.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>
              Notre atelier prend en charge toutes les grandes marques (Husqvarna, Stihl, Honda, Briggs & Stratton…). Nous proposons également une sélection de pièces d'occasion testées pour réduire le coût de vos réparations.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, text: "Garantie 3 mois sur révisions" },
                { icon: Clock, text: "Délais respectés" },
                { icon: Wrench, text: "Toutes marques" },
                { icon: Star, text: "Devis gratuit" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#1A5C1A] flex-shrink-0" />
                  <span className="text-sm text-gray-700" style={{ fontFamily: "'Barlow', sans-serif" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs text-[#1A5C1A] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Ce que nous faisons</span>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-4xl md:text-5xl text-black mt-2">NOS SERVICES</h2>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { icon: Wrench, title: "Réparation & Révision", desc: "Diagnostic, entretien et réparation de tous vos matériels thermiques. Nos techniciens qualifiés remettent votre équipement en parfait état de marche.", cta: "Voir les forfaits", action: () => navigate("repairs") },
              { icon: Package, title: "Pièces d'Occasion", desc: "Sélection de pièces d'occasion testées et contrôlées. Compatible toutes marques. Économisez jusqu'à 70% par rapport au prix du neuf.", cta: "Voir la boutique", action: () => navigate("shop") },
              { icon: TrendingUp, title: "Rachat de matériel", desc: "Proposez-nous votre tondeuse, tronçonneuse ou autre matériel cassé ou inutilisé. Nous étudions votre demande et vous faisons une offre sans engagement.", cta: "Proposer mon matériel", action: () => navigate("buyback") },
              { icon: FileText, title: "Conseils & Blog", desc: "Retrouvez nos conseils d'entretien, tutoriels et actualités sur le blog. Notre équipe partage son expertise pour vous aider au quotidien.", cta: "Lire le blog", action: () => navigate("blog") },
            ].map(({ icon: Icon, title, desc, cta, action }) => (
              <div key={title} className="bg-white p-8 border border-gray-200 group hover:border-[#1A5C1A] transition-all cursor-pointer" onClick={action}>
                <div className="w-11 h-11 bg-[#1A5C1A] flex items-center justify-center mb-6 group-hover:bg-black transition-colors">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl text-black mb-3">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6" style={{ fontFamily: "'Barlow', sans-serif" }}>{desc}</p>
                <div className="flex items-center gap-1 text-[#1A5C1A] font-semibold text-sm group-hover:gap-2 transition-all" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  {cta} <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-xs text-[#4CAF50] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Avis clients</span>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-4xl md:text-5xl text-white mt-2">CE QU'ILS EN PENSENT</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Jean-Pierre M.", date: "Juin 2024", text: "Excellent service ! Ma tondeuse Honda était hors service depuis des mois. En 48h, elle était comme neuve. Prix très raisonnable et équipe sympathique." },
              { name: "Marie-Claire D.", date: "Mai 2024", text: "J'ai commandé plusieurs pièces d'occasion pour ma débroussailleuse. Toutes parfaitement décrites, emballage soigné, livraison rapide. Je recommande vivement !" },
              { name: "Patrick L.", date: "Avril 2024", text: "Diagnostic précis, devis honnête, réparation de qualité. Ma tronçonneuse Husqvarna tourne mieux qu'à la sortie du magasin. Service au top !" },
            ].map(({ name, date, text }) => (
              <div key={name} className="border border-white/10 p-6 bg-white/5">
                <div className="flex mb-3">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-[#4CAF50] text-[#4CAF50]" />)}
                </div>
                <p className="text-white/75 text-sm leading-relaxed mb-5" style={{ fontFamily: "'Barlow', sans-serif" }}>"{text}"</p>
                <div>
                  <p className="font-semibold text-white text-sm" style={{ fontFamily: "'Barlow', sans-serif" }}>{name}</p>
                  <p className="text-xs text-white/40 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white" id="contact">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16">
          <div>
            <span className="text-xs text-[#1A5C1A] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Nous contacter</span>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-4xl md:text-5xl text-black mt-2 mb-8">
              UNE QUESTION ?<br />ÉCRIVEZ-NOUS
            </h2>
            <div className="space-y-4 mb-8">
              {[
                { icon: Phone, label: "+33 (0)6 12 34 56 78" },
                { icon: Mail, label: "contact@domotoculture.fr" },
                { icon: MapPin, label: "12 rue des Artisans, 69000 Lyon" },
                { icon: Clock, label: "Lun–Ven 8h–18h · Sam 9h–12h" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1A5C1A] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700" style={{ fontFamily: "'Barlow', sans-serif" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            {contactSent ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
                <div className="w-16 h-16 bg-[#1A5C1A] flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-2xl text-black">Message envoyé !</h3>
                <p className="text-gray-600" style={{ fontFamily: "'Barlow', sans-serif" }}>Nous vous répondrons dans les meilleurs délais.</p>
              </div>
            ) : (
              <form onSubmit={submitContact} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Nom *</label>
                    <input type="text" required value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Jean Martin" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Email *</label>
                    <input type="email" required value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="jean@email.fr" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Téléphone</label>
                  <input type="tel" value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="06 12 34 56 78" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Sujet *</label>
                  <select required value={contactForm.subject} onChange={e => setContactForm(p => ({ ...p, subject: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors bg-white" style={{ fontFamily: "'Barlow', sans-serif" }}>
                    <option value="">Sélectionnez un sujet</option>
                    <option>Demande de devis réparation</option>
                    <option>Question sur une pièce</option>
                    <option>Suivi de commande</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Message *</label>
                  <textarea required rows={5} value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors resize-none" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Décrivez votre besoin..." />
                </div>
                <button type="submit" className="w-full bg-[#1A5C1A] text-white py-3 font-semibold tracking-wide hover:bg-[#2D7A2D] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  ENVOYER LE MESSAGE
                </button>
                <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  <Shield className="w-3 h-3" />
                  Formulaire sécurisé. Aucune pièce jointe n'est acceptée pour des raisons de sécurité.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  // ─── SHOP PAGE ────────────────────────────────────────────────────────────────
  const ShopPage = () => (
    <div className="pt-16 min-h-screen bg-white">
      <div className="bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs text-[#4CAF50] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Pièces détachées</span>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-5xl md:text-6xl text-white mt-2">BOUTIQUE</h1>
          <p className="text-white/65 mt-2" style={{ fontFamily: "'Barlow', sans-serif" }}>Pièces d'occasion testées et contrôlées · Paiement 100% sécurisé via Stripe</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher une pièce..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-2 text-sm font-medium transition-colors ${categoryFilter === cat ? "bg-[#1A5C1A] text-white" : "border border-gray-300 text-gray-700 hover:border-[#1A5C1A]"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredParts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4" />
            <p style={{ fontFamily: "'Barlow', sans-serif" }}>Aucune pièce trouvée</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredParts.map(part => (
              <div key={part.id} className="border border-gray-200 bg-white group hover:border-[#1A5C1A] transition-all">
                <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                  <img src={part.image} alt={part.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 ${conditionColor[part.condition]}`} style={{ fontFamily: "'Barlow', sans-serif" }}>{part.condition}</span>
                    <span className="text-xs text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{part.category}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 mb-1 leading-tight" style={{ fontFamily: "'Barlow', sans-serif" }}>{part.name}</h3>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>{part.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-[#1A5C1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(part.price)}</span>
                    <button onClick={() => addToCart(part)} disabled={part.stock === 0}
                      className="bg-[#1A5C1A] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#2D7A2D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-1"
                      style={{ fontFamily: "'Barlow', sans-serif" }}>
                      <Plus className="w-3 h-3" />
                      {part.stock === 0 ? "Épuisé" : "Ajouter"}
                    </button>
                  </div>
                  {part.stock <= 2 && part.stock > 0 && (
                    <p className="text-xs text-orange-600 mt-1.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Plus que {part.stock} en stock</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-50 border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap gap-6 justify-center">
          {[
            { icon: Lock, text: "Paiement 100% sécurisé" },
            { icon: Shield, text: "Données chiffrées SSL" },
            { icon: CreditCard, text: "Powered by Stripe" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-gray-600">
              <Icon className="w-4 h-4 text-[#1A5C1A]" />
              <span className="text-sm" style={{ fontFamily: "'Barlow', sans-serif" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── BUYBACK PAGE ──────────────────────────────────────────────────────────────
  const BuybackPage = () => (
    <div className="pt-16 min-h-screen bg-white">
      <div className="bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs text-[#4CAF50] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Seconde vie & économie circulaire</span>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-5xl md:text-6xl text-white mt-2 leading-none">RACHAT DE VOTRE<br /><span className="text-[#4CAF50]">MATÉRIEL</span></h1>
          <p className="text-white/65 mt-4 max-w-2xl" style={{ fontFamily: "'Barlow', sans-serif" }}>Votre matériel est cassé, en panne ou ne vous sert plus ? Proposez-le-nous. Après étude, nous vous transmettons une offre de rachat claire et sans engagement.</p>
        </div>
      </div>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", title: "Décrivez votre matériel", text: "Indiquez le type de machine, sa marque, son modèle et son état général." },
              { n: "02", title: "Nous l'évaluons", text: "Notre atelier étudie la réparabilité, les pièces récupérables et la valeur du matériel." },
              { n: "03", title: "Recevez une offre", text: "Nous vous contactons avec une proposition. Vous restez libre de l'accepter ou non." },
            ].map(step => (
              <div key={step.n} className="bg-white border border-gray-200 p-7 hover:border-[#1A5C1A] transition-colors">
                <div className="text-[#1A5C1A] text-sm font-bold mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{step.n}</div>
                <h2 className="font-bold text-2xl text-black mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{step.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-[0.8fr_1.2fr] gap-14 items-start">
          <div>
            <span className="text-xs text-[#1A5C1A] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Matériels recherchés</span>
            <h2 className="font-black text-4xl md:text-5xl text-black mt-2 mb-6 leading-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>NE LE JETEZ PAS,<br />DONNEZ-LUI UNE SECONDE VIE</h2>
            <p className="text-gray-600 leading-relaxed mb-7">Nous pouvons étudier les tondeuses, autoportées, tronçonneuses, débroussailleuses, taille-haies, souffleurs, motoculteurs et pièces détachées, même lorsqu'ils ne démarrent plus.</p>
            <div className="space-y-3">
              {["Matériel complet ou pour pièces", "Thermique, électrique ou sur batterie", "Toutes grandes marques", "Estimation sans engagement"].map(text => (
                <div key={text} className="flex items-center gap-3 text-gray-700">
                  <div className="w-7 h-7 bg-[#1A5C1A] flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 border-l-4 border-[#1A5C1A] bg-gray-50 p-5 text-sm text-gray-600 leading-relaxed">
              L'offre finale dépend de l'état réel du matériel après contrôle. Le dépôt ou la reprise n'est confirmé qu'après accord des deux parties.
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
            {buybackSent ? (
              <div className="py-14 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-[#1A5C1A] flex items-center justify-center mb-5"><CheckCircle className="w-8 h-8 text-white" /></div>
                <h2 className="font-black text-3xl text-black mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>DEMANDE ENVOYÉE</h2>
                <p className="text-gray-600 max-w-md">Votre proposition a bien été enregistrée. L'équipe Do' Motoculture pourra vous recontacter après étude.</p>
                <button onClick={() => setBuybackSent(false)} className="mt-7 bg-black text-white px-6 py-3 font-semibold hover:bg-[#1A5C1A] transition-colors">PROPOSER UN AUTRE MATÉRIEL</button>
              </div>
            ) : (
              <form onSubmit={submitBuyback} className="space-y-4">
                <div>
                  <span className="text-xs text-[#1A5C1A] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Demande d'estimation</span>
                  <h2 className="font-black text-3xl text-black mt-1 mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>PROPOSEZ VOTRE MATÉRIEL</h2>
                  <p className="text-sm text-gray-500 mb-6">Les champs marqués d'un astérisque sont obligatoires.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700">Nom *<input required maxLength={80} value={buybackForm.name} onChange={e => setBuybackForm(p => ({...p, name:e.target.value}))} className="mt-1 w-full border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-[#1A5C1A]" /></label>
                  <label className="text-sm font-medium text-gray-700">Téléphone *<input required maxLength={30} value={buybackForm.phone} onChange={e => setBuybackForm(p => ({...p, phone:e.target.value}))} className="mt-1 w-full border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-[#1A5C1A]" /></label>
                </div>
                <label className="text-sm font-medium text-gray-700 block">Email *<input required type="email" maxLength={120} value={buybackForm.email} onChange={e => setBuybackForm(p => ({...p, email:e.target.value}))} className="mt-1 w-full border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-[#1A5C1A]" /></label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700">Type de matériel *<select required value={buybackForm.equipment} onChange={e => setBuybackForm(p => ({...p, equipment:e.target.value}))} className="mt-1 w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:border-[#1A5C1A]"><option value="">Sélectionner</option><option>Tondeuse</option><option>Autoportée</option><option>Tronçonneuse</option><option>Débroussailleuse</option><option>Taille-haies</option><option>Souffleur</option><option>Motoculteur</option><option>Pièces détachées</option><option>Autre</option></select></label>
                  <label className="text-sm font-medium text-gray-700">Marque et modèle<input maxLength={120} value={buybackForm.brandModel} onChange={e => setBuybackForm(p => ({...p, brandModel:e.target.value}))} placeholder="Ex. Stihl MS 250" className="mt-1 w-full border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-[#1A5C1A]" /></label>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-sm font-medium text-gray-700">État *<select required value={buybackForm.condition} onChange={e => setBuybackForm(p => ({...p, condition:e.target.value}))} className="mt-1 w-full border border-gray-300 bg-white px-3 py-2.5 focus:outline-none focus:border-[#1A5C1A]"><option value="">Sélectionner</option><option>Fonctionnel</option><option>Fonctionne mal</option><option>Ne démarre plus</option><option>Cassé / incomplet</option><option>Pour pièces</option></select></label>
                  <label className="text-sm font-medium text-gray-700">Prix souhaité (€)<input inputMode="decimal" maxLength={12} value={buybackForm.desiredPrice} onChange={e => setBuybackForm(p => ({...p, desiredPrice:e.target.value}))} placeholder="Facultatif" className="mt-1 w-full border border-gray-300 px-3 py-2.5 focus:outline-none focus:border-[#1A5C1A]" /></label>
                </div>
                <label className="text-sm font-medium text-gray-700 block">Description *<textarea required minLength={20} maxLength={2000} rows={5} value={buybackForm.description} onChange={e => setBuybackForm(p => ({...p, description:e.target.value}))} placeholder="Décrivez la panne, l'état général, les pièces manquantes et l'ancienneté approximative..." className="mt-1 w-full border border-gray-300 px-3 py-2.5 resize-y focus:outline-none focus:border-[#1A5C1A]" /></label>
                {buybackError && <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-sm text-red-700"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{buybackError}</div>}
                <button disabled={buybackLoading} className="w-full bg-[#1A5C1A] text-white py-3.5 font-semibold tracking-wide hover:bg-[#2D7A2D] disabled:opacity-60 transition-colors">{buybackLoading ? "ENVOI EN COURS..." : "ENVOYER MA PROPOSITION"}</button>
                <p className="text-xs text-gray-400 leading-relaxed">Vos coordonnées sont utilisées uniquement pour étudier cette demande et vous recontacter.</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  // ─── REPAIRS PAGE ──────────────────────────────────────────────────────────────
  const RepairsPage = () => (
    <div className="pt-16 min-h-screen">
      <div className="bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs text-[#4CAF50] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Nos forfaits</span>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-5xl md:text-6xl text-white mt-2">RÉPARATIONS</h1>
          <p className="text-white/65 mt-2" style={{ fontFamily: "'Barlow', sans-serif" }}>Des forfaits clairs et transparents · Devis gratuit avant toute intervention</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PACKAGES.map(pkg => (
            <div key={pkg.id} className={`border-2 p-6 relative flex flex-col ${pkg.popular ? "border-[#1A5C1A] bg-[#1A5C1A]" : "border-gray-200 bg-white"}`}>
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-semibold px-3 py-1 tracking-wide whitespace-nowrap" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  RECOMMANDÉ
                </div>
              )}
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className={`font-black text-2xl mb-1 ${pkg.popular ? "text-white" : "text-black"}`}>{pkg.name}</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`font-bold text-3xl ${pkg.popular ? "text-white" : "text-[#1A5C1A]"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pkg.price}€</span>
                <span className={`text-sm ${pkg.popular ? "text-white/65" : "text-gray-500"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>TTC</span>
              </div>
              <div className={`flex items-center gap-1.5 mb-4 text-xs ${pkg.popular ? "text-white/65" : "text-gray-500"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <Clock className="w-3 h-3" /> {pkg.duration}
              </div>
              <p className={`text-sm mb-6 leading-relaxed flex-shrink-0 ${pkg.popular ? "text-white/80" : "text-gray-600"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>{pkg.description}</p>
              <ul className="space-y-2 flex-1 mb-6">
                {pkg.services.map(s => (
                  <li key={s} className={`flex items-start gap-2 text-sm ${pkg.popular ? "text-white/90" : "text-gray-700"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${pkg.popular ? "text-white" : "text-[#1A5C1A]"}`} /> {s}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate("home")} className={`w-full py-3 font-semibold text-sm tracking-wide transition-colors ${pkg.popular ? "bg-white text-[#1A5C1A] hover:bg-gray-100" : "bg-[#1A5C1A] text-white hover:bg-[#2D7A2D]"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>
                DEMANDER UN DEVIS
              </button>
            </div>
          ))}
        </div>

        <div className="mt-20 max-w-2xl mx-auto">
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-4xl text-black mb-8 text-center">QUESTIONS FRÉQUENTES</h2>
          <div className="space-y-3">
            {[
              { q: "Le devis est-il vraiment gratuit ?", a: "Oui, le diagnostic et le devis sont entièrement gratuits et sans engagement. Vous n'êtes facturé que si vous acceptez l'intervention." },
              { q: "Quelles marques prenez-vous en charge ?", a: "Nous prenons en charge toutes les grandes marques : Husqvarna, Stihl, Honda, Briggs & Stratton, Kawasaki, McCulloch, MTD, et bien d'autres." },
              { q: "Puis-je déposer mon matériel directement à l'atelier ?", a: "Oui, notre atelier est ouvert du lundi au vendredi de 8h à 18h et le samedi de 9h à 12h. Vous pouvez déposer votre matériel sans rendez-vous." },
              { q: "Les pièces remplacées sont-elles garanties ?", a: "Toutes nos interventions sont garanties 3 mois sur la main d'œuvre. Les pièces neuves bénéficient de leur propre garantie constructeur." },
            ].map(({ q, a }) => (
              <div key={q} className="border border-gray-200">
                <button onClick={() => setOpenFaq(openFaq === q ? null : q)} className="w-full flex items-center justify-between p-4 font-medium text-gray-900 hover:text-[#1A5C1A] transition-colors text-left" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  {q}
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${openFaq === q ? "rotate-180" : ""}`} />
                </button>
                {openFaq === q && <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3" style={{ fontFamily: "'Barlow', sans-serif" }}>{a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── BLOG PAGE ────────────────────────────────────────────────────────────────
  const BlogPage = () => (
    <div className="pt-16 min-h-screen">
      <div className="bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs text-[#4CAF50] tracking-[0.2em] uppercase font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Actualités & Conseils</span>
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-5xl md:text-6xl text-white mt-2">BLOG</h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {posts.map(post => (
            <article key={post.id} onClick={() => { setPostId(post.id); navigate("post"); }} className="cursor-pointer border border-gray-200 bg-white hover:border-[#1A5C1A] transition-all group">
              <div className="aspect-video overflow-hidden bg-gray-100">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-[#1A5C1A] text-white text-xs font-semibold px-2 py-0.5" style={{ fontFamily: "'Barlow', sans-serif" }}>{post.category}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}><Clock className="w-3 h-3" /> {post.readTime} min</span>
                </div>
                <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl text-black mb-3 leading-tight group-hover:text-[#1A5C1A] transition-colors">{post.title}</h2>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}><Calendar className="w-3 h-3" /> {post.date}</span>
                  <span className="text-sm text-[#1A5C1A] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ fontFamily: "'Barlow', sans-serif" }}>Lire <ChevronRight className="w-4 h-4" /></span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── BLOG POST ────────────────────────────────────────────────────────────────
  const BlogPostPage = () => {
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    return (
      <div className="pt-16 min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <button onClick={() => navigate("blog")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A5C1A] mb-8 transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
            <ArrowLeft className="w-4 h-4" /> Retour au blog
          </button>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-[#1A5C1A] text-white text-xs font-semibold px-2 py-0.5" style={{ fontFamily: "'Barlow', sans-serif" }}>{post.category}</span>
              <span className="text-xs text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{post.date}</span>
              <span className="text-xs text-gray-400 flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}><Clock className="w-3 h-3" /> {post.readTime} min de lecture</span>
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-4xl md:text-5xl text-black leading-tight">{post.title}</h1>
            <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: "'Barlow', sans-serif" }}>Par {post.author}</p>
          </div>
          <img src={post.image} alt={post.title} className="w-full aspect-video object-cover mb-8 bg-gray-200" />
          <div className="space-y-4">
            {post.content.split("\n\n").map((para, i) => (
              <p key={i} className={`leading-relaxed ${para.length < 60 && !para.includes(" ") ? "font-semibold text-black text-base" : "text-gray-700 text-base"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>{para}</p>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── CHECKOUT ─────────────────────────────────────────────────────────────────
  const CheckoutPage = () => {
    if (checkoutStep === "success") {
      return (
        <div className="pt-16 min-h-screen flex items-center justify-center bg-white px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-[#1A5C1A] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-4xl text-black mb-4">COMMANDE CONFIRMÉE !</h1>
            <p className="text-gray-600 mb-2" style={{ fontFamily: "'Barlow', sans-serif" }}>Merci pour votre commande, <strong>{customerInfo.name}</strong>.</p>
            <p className="text-gray-600 mb-8" style={{ fontFamily: "'Barlow', sans-serif" }}>Un email de confirmation a été envoyé à <strong>{customerInfo.email}</strong>.</p>
            <button onClick={() => { navigate("shop"); setCheckoutStep("cart"); }} className="bg-[#1A5C1A] text-white px-8 py-3 font-semibold hover:bg-[#2D7A2D] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
              CONTINUER LES ACHATS
            </button>
          </div>
        </div>
      );
    }

    const stepIndex = { cart: 0, info: 1, payment: 2 }[checkoutStep as "cart" | "info" | "payment"];

    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <button onClick={() => navigate("shop")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A5C1A] mb-8 transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
            <ArrowLeft className="w-4 h-4" /> Retour à la boutique
          </button>

          <div className="flex items-center gap-3 mb-10">
            {[{ step: "cart", label: "Panier" }, { step: "info", label: "Coordonnées" }, { step: "payment", label: "Paiement" }].map(({ step, label }, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors ${i <= stepIndex ? "bg-[#1A5C1A] text-white" : "bg-gray-200 text-gray-500"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>
                  {i < stepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i === stepIndex ? "text-[#1A5C1A]" : "text-gray-400"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>{label}</span>
                {i < 2 && <div className="w-8 h-px bg-gray-300" />}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {checkoutStep === "cart" && (
                <div className="bg-white border border-gray-200 p-6">
                  <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-2xl text-black mb-6">RÉCAPITULATIF</h2>
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3" />
                      <p style={{ fontFamily: "'Barlow', sans-serif" }}>Votre panier est vide</p>
                    </div>
                  ) : (
                    <>
                      {cart.map(item => (
                        <div key={item.part.id} className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
                          <img src={item.part.image} alt={item.part.name} className="w-20 h-16 object-cover bg-gray-100 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900" style={{ fontFamily: "'Barlow', sans-serif" }}>{item.part.name}</p>
                            <p className="text-sm text-gray-500" style={{ fontFamily: "'Barlow', sans-serif" }}>{item.part.condition}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => updateQty(item.part.id, item.qty - 1)} className="w-6 h-6 bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors leading-none">−</button>
                              <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                              <button onClick={() => updateQty(item.part.id, item.qty + 1)} className="w-6 h-6 bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors leading-none">+</button>
                              <button onClick={() => removeFromCart(item.part.id)} className="ml-auto text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <span className="font-bold text-[#1A5C1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.part.price * item.qty)}</span>
                        </div>
                      ))}
                      <button onClick={() => setCheckoutStep("info")} className="mt-6 w-full bg-[#1A5C1A] text-white py-3 font-semibold hover:bg-[#2D7A2D] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
                        CONTINUER →
                      </button>
                    </>
                  )}
                </div>
              )}

              {checkoutStep === "info" && (
                <div className="bg-white border border-gray-200 p-6">
                  <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-2xl text-black mb-6">VOS COORDONNÉES</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Nom complet *</label>
                        <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Jean Martin" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Email *</label>
                        <input type="email" value={customerInfo.email} onChange={e => setCustomerInfo(p => ({ ...p, email: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="jean@email.fr" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Téléphone *</label>
                      <input type="tel" value={customerInfo.phone} onChange={e => setCustomerInfo(p => ({ ...p, phone: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="06 12 34 56 78" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Adresse *</label>
                      <input type="text" value={customerInfo.address} onChange={e => setCustomerInfo(p => ({ ...p, address: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="12 rue des Jardins" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Ville *</label>
                        <input type="text" value={customerInfo.city} onChange={e => setCustomerInfo(p => ({ ...p, city: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Lyon" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Code postal *</label>
                        <input type="text" value={customerInfo.zip} onChange={e => setCustomerInfo(p => ({ ...p, zip: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1A5C1A] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="69000" />
                      </div>
                    </div>
                    <button onClick={() => { if (customerInfo.name && customerInfo.email && customerInfo.phone && customerInfo.address && customerInfo.city && customerInfo.zip) setCheckoutStep("payment"); }} className="w-full bg-[#1A5C1A] text-white py-3 font-semibold hover:bg-[#2D7A2D] transition-colors mt-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
                      PASSER AU PAIEMENT →
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === "payment" && (
                <div className="bg-white border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-2xl text-black">PAIEMENT SÉCURISÉ</h2>
                    <Lock className="w-4 h-4 text-[#1A5C1A]" />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 p-3 mb-6 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700" style={{ fontFamily: "'Barlow', sans-serif" }}>Paiement traité par <strong>Stripe</strong>. Vos données bancaires sont chiffrées (TLS 256-bit) et ne sont jamais stockées sur nos serveurs.</p>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700" style={{ fontFamily: "'Barlow', sans-serif" }}>Vous allez être redirigé vers la page Stripe Checkout. Aucun numéro de carte, date d'expiration ou CVV n'est saisi ni stocké sur ce site.</p>
                    <button onClick={submitPayment} disabled={paymentLoading}
                      className="w-full bg-[#1A5C1A] text-white py-3.5 font-semibold tracking-wide hover:bg-[#2D7A2D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                      style={{ fontFamily: "'Barlow', sans-serif" }}>
                      {paymentLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Traitement en cours…
                        </>
                      ) : (
                        <><Lock className="w-4 h-4" /> PAYER {fmt(cartTotal)}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 p-5 h-fit">
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-lg text-black mb-4">RÉCAPITULATIF</h3>
              {cart.map(item => (
                <div key={item.part.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0 gap-2">
                  <span className="text-sm text-gray-700 flex-1 min-w-0 truncate" style={{ fontFamily: "'Barlow', sans-serif" }}>{item.part.name} ×{item.qty}</span>
                  <span className="text-sm font-medium text-gray-900 flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.part.price * item.qty)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600" style={{ fontFamily: "'Barlow', sans-serif" }}>Sous-total</span>
                  <span className="text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600" style={{ fontFamily: "'Barlow', sans-serif" }}>Livraison</span>
                  <span className="text-xs text-[#1A5C1A]" style={{ fontFamily: "'Barlow', sans-serif" }}>À l'expédition</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-900" style={{ fontFamily: "'Barlow', sans-serif" }}>Total</span>
                  <span className="font-bold text-xl text-[#1A5C1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(cartTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
  const AdminPage = () => {
    if (!currentUser) {
      return (
        <div className="pt-16 min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 mb-8 justify-center">
              <div className="w-8 h-8 bg-[#1A5C1A] flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl text-white">DO' MOTOCULTURE</span>
            </div>
            <div className="bg-gray-900 border border-white/10 p-8">
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-2xl text-white mb-1">ESPACE ADMIN</h1>
              <p className="text-gray-400 text-sm mb-6" style={{ fontFamily: "'Barlow', sans-serif" }}>Connexion sécurisée · Accès réservé</p>
              {loginError && (
                <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-sm px-3 py-2 mb-4 flex items-center gap-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {loginError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Email</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="admin@domotoculture.fr" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Mot de passe</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="••••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button onClick={handleLogin} className="w-full bg-[#1A5C1A] text-white py-3 font-semibold tracking-wide hover:bg-[#2D7A2D] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  SE CONNECTER
                </button>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-500 text-center" style={{ fontFamily: "'Barlow', sans-serif" }}>Les identifiants administrateur sont définis uniquement dans le fichier .env du serveur.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const revenue = orders.reduce((s, o) => s + o.total, 0);

    return (
      <div className="pt-16 min-h-screen bg-gray-950 flex">
        {/* Sidebar */}
        <div className="w-60 bg-gray-900 border-r border-white/10 flex-col fixed left-0 top-16 bottom-0 z-30 hidden lg:flex">
          <div className="p-4 border-b border-white/10">
            <p className="font-semibold text-white text-sm" style={{ fontFamily: "'Barlow', sans-serif" }}>{currentUser.name}</p>
            <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{currentUser.email}</p>
            <span className="inline-block mt-2 bg-[#1A5C1A] text-white text-xs px-2 py-0.5 font-medium" style={{ fontFamily: "'Barlow', sans-serif" }}>{currentUser.role}</span>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {([
              { id: "overview" as AdminSection, icon: BarChart3, label: "Vue d'ensemble" },
              { id: "products" as AdminSection, icon: Package, label: "Pièces" },
              { id: "blog-mgmt" as AdminSection, icon: FileText, label: "Blog" },
              { id: "orders" as AdminSection, icon: ShoppingCart, label: "Commandes" },
              ...(currentUser.role === "admin" ? [{ id: "users" as AdminSection, icon: Users, label: "Utilisateurs" }] : []),
            ] as { id: AdminSection; icon: React.ComponentType<{ className?: string }>; label: string }[]).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setAdminSection(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${adminSection === id ? "bg-[#1A5C1A] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>
                <Icon className="w-4 h-4 flex-shrink-0" /> {label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 lg:ml-60 p-5 overflow-auto">
          {/* Mobile nav */}
          <div className="lg:hidden flex gap-2 flex-wrap mb-6">
            {([
              { id: "overview" as AdminSection, label: "Accueil" },
              { id: "products" as AdminSection, label: "Pièces" },
              { id: "blog-mgmt" as AdminSection, label: "Blog" },
              { id: "orders" as AdminSection, label: "Commandes" },
              ...(currentUser.role === "admin" ? [{ id: "users" as AdminSection, label: "Users" }] : []),
            ] as { id: AdminSection; label: string }[]).map(({ id, label }) => (
              <button key={id} onClick={() => setAdminSection(id)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${adminSection === id ? "bg-[#1A5C1A] text-white" : "border border-white/20 text-gray-400 hover:text-white"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>
                {label}
              </button>
            ))}
            <button onClick={handleLogout} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 border border-white/20 hover:text-white" style={{ fontFamily: "'Barlow', sans-serif" }}>
              <LogOut className="w-3 h-3" /> Déco
            </button>
          </div>

          {/* Overview */}
          {adminSection === "overview" && (
            <div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-3xl text-white mb-6">VUE D'ENSEMBLE</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: ShoppingCart, label: "Commandes", value: orders.length, sub: `${orders.filter(o => o.status === "en_attente").length} en attente` },
                  { icon: TrendingUp, label: "Chiffre d'affaires", value: fmt(revenue), sub: "Total commandes" },
                  { icon: Package, label: "Pièces", value: parts.length, sub: `${parts.filter(p => p.stock > 0).length} disponibles` },
                  { icon: Users, label: "Utilisateurs", value: accounts.length, sub: `${accounts.filter(a => a.role === "admin").length} admin` },
                ].map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="bg-gray-900 border border-white/10 p-5">
                    <Icon className="w-5 h-5 text-[#4CAF50] mb-3" />
                    <div className="font-bold text-2xl text-white mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
                    <div className="text-sm text-gray-400" style={{ fontFamily: "'Barlow', sans-serif" }}>{label}</div>
                    <div className="text-xs text-gray-600 mt-0.5" style={{ fontFamily: "'Barlow', sans-serif" }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 border border-white/10 p-5">
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-lg text-white mb-4">COMMANDES RÉCENTES</h3>
                <div className="space-y-3">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-sm text-white font-medium" style={{ fontFamily: "'Barlow', sans-serif" }}>{order.customerName}</p>
                        <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.id} · {order.date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 font-medium ${statusColor[order.status]}`} style={{ fontFamily: "'Barlow', sans-serif" }}>{statusLabel[order.status]}</span>
                        <span className="text-sm text-white font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Products */}
          {adminSection === "products" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-3xl text-white">PIÈCES ({parts.length})</h1>
                <button onClick={() => { setShowAddPart(true); setEditingPartId(null); setNewPart({ name: "", price: 0, category: "Moteur", condition: "Bon état", description: "", stock: 1, image: "" }); }} className="bg-[#1A5C1A] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2D7A2D] transition-colors flex items-center gap-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>

              {showAddPart && (
                <div className="bg-gray-900 border border-white/10 p-6 mb-6">
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl text-white mb-4">{editingPartId ? "MODIFIER LA PIÈCE" : "NOUVELLE PIÈCE"}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Nom de la pièce *</label>
                      <input type="text" value={newPart.name || ""} onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Ex: Carburateur Honda GCV160" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Prix (€) *</label>
                      <input type="number" value={newPart.price || ""} onChange={e => setNewPart(p => ({ ...p, price: parseFloat(e.target.value) }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="29.90" min={0} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Catégorie</label>
                      <select value={newPart.category || "Moteur"} onChange={e => setNewPart(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
                        {CATEGORIES.filter(c => c !== "Tous").map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>État</label>
                      <select value={newPart.condition || "Bon état"} onChange={e => setNewPart(p => ({ ...p, condition: e.target.value as PartCondition }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>
                        {["Neuf", "Très bon état", "Bon état", "Reconditionné"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Stock</label>
                      <input type="number" value={newPart.stock ?? 1} onChange={e => setNewPart(p => ({ ...p, stock: parseInt(e.target.value) }))} min={0} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Photo (depuis votre PC)</label>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      <div className="flex gap-2 items-center">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 border border-dashed border-white/20 text-gray-400 px-3 py-2 text-xs hover:border-[#4CAF50] hover:text-white transition-colors flex items-center justify-center gap-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
                          <Upload className="w-3.5 h-3.5" />
                          {newPart.image ? "Changer la photo" : "Choisir depuis mon PC"}
                        </button>
                        {newPart.image && <img src={newPart.image} alt="aperçu" className="w-12 h-10 object-cover border border-white/10 flex-shrink-0" />}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Description</label>
                      <textarea rows={3} value={newPart.description || ""} onChange={e => setNewPart(p => ({ ...p, description: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50] transition-colors resize-none" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Description de la pièce, compatibilité..." />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={savePart} className="bg-[#1A5C1A] text-white px-5 py-2 text-sm font-semibold hover:bg-[#2D7A2D] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>{editingPartId ? "ENREGISTRER" : "AJOUTER"}</button>
                    <button onClick={() => { setShowAddPart(false); setEditingPartId(null); }} className="border border-white/20 text-gray-400 px-5 py-2 text-sm hover:text-white transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>Annuler</button>
                  </div>
                </div>
              )}

              <div className="bg-gray-900 border border-white/10 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Pièce", "Catégorie", "État", "Prix", "Stock", ""].map(h => (
                        <th key={h} className="text-left p-4 text-xs text-gray-400 uppercase tracking-wide font-medium" style={{ fontFamily: "'Barlow', sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map(part => (
                      <tr key={part.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={part.image} alt={part.name} className="w-10 h-8 object-cover bg-gray-700 flex-shrink-0" />
                            <span className="text-sm text-white" style={{ fontFamily: "'Barlow', sans-serif" }}>{part.name}</span>
                          </div>
                        </td>
                        <td className="p-4"><span className="text-xs text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{part.category}</span></td>
                        <td className="p-4"><span className={`text-xs px-2 py-0.5 font-medium ${conditionColor[part.condition]}`} style={{ fontFamily: "'Barlow', sans-serif" }}>{part.condition}</span></td>
                        <td className="p-4"><span className="text-sm text-white font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(part.price)}</span></td>
                        <td className="p-4"><span className={`text-sm font-medium ${part.stock === 0 ? "text-red-400" : "text-[#4CAF50]"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{part.stock}</span></td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => editPart(part)} className="p-1.5 text-gray-400 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deletePart(part.id)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Blog management */}
          {adminSection === "blog-mgmt" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-3xl text-white">BLOG ({posts.length})</h1>
                <button onClick={() => setShowAddPost(true)} className="bg-[#1A5C1A] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2D7A2D] transition-colors flex items-center gap-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  <Plus className="w-4 h-4" /> Nouvel article
                </button>
              </div>

              {showAddPost && (
                <div className="bg-gray-900 border border-white/10 p-6 mb-6">
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl text-white mb-4">NOUVEL ARTICLE</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Titre *</label>
                      <input type="text" value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Titre de l'article" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Catégorie</label>
                        <select value={newPost.category} onChange={e => setNewPost(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }}>
                          {["Entretien", "Conseils", "Sécurité", "Actualités"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>URL image (optionnel)</label>
                        <input type="text" value={newPost.image} onChange={e => setNewPost(p => ({ ...p, image: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="https://..." />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Extrait (affiché dans la liste)</label>
                      <input type="text" value={newPost.excerpt} onChange={e => setNewPost(p => ({ ...p, excerpt: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Résumé court de l'article..." />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Contenu complet *</label>
                      <textarea rows={8} value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50] resize-none" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Contenu de l'article (sautez une ligne pour séparer les paragraphes)..." />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={savePost} className="bg-[#1A5C1A] text-white px-5 py-2 text-sm font-semibold hover:bg-[#2D7A2D] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>PUBLIER</button>
                      <button onClick={() => setShowAddPost(false)} className="border border-white/20 text-gray-400 px-5 py-2 text-sm hover:text-white transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>Annuler</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {posts.map(post => (
                  <div key={post.id} className="bg-gray-900 border border-white/10 p-4 flex items-center gap-4">
                    <img src={post.image} alt={post.title} className="w-16 h-12 object-cover bg-gray-700 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate" style={{ fontFamily: "'Barlow', sans-serif" }}>{post.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{post.date}</span>
                        <span className="bg-[#1A5C1A]/30 text-[#4CAF50] text-xs px-2 py-0.5" style={{ fontFamily: "'Barlow', sans-serif" }}>{post.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setPostId(post.id); navigate("post"); }} className="p-1.5 text-gray-400 hover:text-white transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => setPosts(p => p.filter(b => b.id !== post.id))} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {adminSection === "orders" && (
            <div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-3xl text-white mb-6">COMMANDES ({orders.length})</h1>
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="bg-gray-900 border border-white/10 p-5">
                    <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm text-[#4CAF50] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.id}</span>
                          <span className={`text-xs px-2 py-0.5 font-medium ${statusColor[order.status]}`} style={{ fontFamily: "'Barlow', sans-serif" }}>{statusLabel[order.status]}</span>
                        </div>
                        <p className="text-white font-medium mt-1" style={{ fontFamily: "'Barlow', sans-serif" }}>{order.customerName}</p>
                        <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.customerEmail} · {order.date}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(order.total)}</span>
                        <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "'Barlow', sans-serif" }}>{order.items.reduce((s, i) => s + i.qty, 0)} article(s)</p>
                      </div>
                    </div>
                    <div className="border-t border-white/5 pt-3">
                      <p className="text-xs text-gray-400 mb-2" style={{ fontFamily: "'Barlow', sans-serif" }}>Mettre à jour le statut :</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(["en_attente", "en_cours", "expédié", "livré"] as OrderStatus[]).map(s => (
                          <button key={s} onClick={async () => { const r = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) }); if (r.ok) setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: s } : o)); }}
                            className={`text-xs px-3 py-1 font-medium transition-colors border ${order.status === s ? statusColor[s] + " border-transparent" : "border-white/10 text-gray-500 hover:text-white"}`}
                            style={{ fontFamily: "'Barlow', sans-serif" }}>
                            {statusLabel[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {adminSection === "users" && currentUser.role === "admin" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-black text-3xl text-white">UTILISATEURS ({accounts.length})</h1>
                <button onClick={() => setShowAddUser(true)} className="bg-[#1A5C1A] text-white px-4 py-2 text-sm font-semibold hover:bg-[#2D7A2D] transition-colors flex items-center gap-2" style={{ fontFamily: "'Barlow', sans-serif" }}>
                  <Plus className="w-4 h-4" /> Créer un compte
                </button>
              </div>

              {showAddUser && (
                <div className="bg-gray-900 border border-white/10 p-6 mb-6">
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-xl text-white mb-4">NOUVEAU COMPTE</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Nom complet *</label>
                      <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="Prénom Nom" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Email *</label>
                      <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="email@exemple.fr" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Mot de passe *</label>
                      <input type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }} placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>Rôle</label>
                      <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as UserRole }))} className="w-full bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:border-[#4CAF50]" style={{ fontFamily: "'Barlow', sans-serif" }}>
                        <option value="user">Utilisateur</option>
                        <option value="invité">Invité</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={saveUser} className="bg-[#1A5C1A] text-white px-5 py-2 text-sm font-semibold hover:bg-[#2D7A2D] transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>CRÉER</button>
                    <button onClick={() => setShowAddUser(false)} className="border border-white/20 text-gray-400 px-5 py-2 text-sm hover:text-white transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>Annuler</button>
                  </div>
                </div>
              )}

              <div className="bg-gray-900 border border-white/10 overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Utilisateur", "Email", "Rôle", "Créé le", ""].map(h => (
                        <th key={h} className="text-left p-4 text-xs text-gray-400 uppercase tracking-wide font-medium" style={{ fontFamily: "'Barlow', sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(acc => (
                      <tr key={acc.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-[#1A5C1A]/30 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-[#4CAF50]" />
                            </div>
                            <span className="text-sm text-white" style={{ fontFamily: "'Barlow', sans-serif" }}>{acc.name}</span>
                          </div>
                        </td>
                        <td className="p-4"><span className="text-xs text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{acc.email}</span></td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 font-medium ${acc.role === "admin" ? "bg-purple-100 text-purple-800" : acc.role === "user" ? "bg-blue-100 text-blue-800" : "bg-gray-700 text-gray-300"}`} style={{ fontFamily: "'Barlow', sans-serif" }}>
                            {acc.role}
                          </span>
                        </td>
                        <td className="p-4"><span className="text-xs text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{acc.createdAt}</span></td>
                        <td className="p-4 text-right">
                          {acc.role !== "admin" && (
                            <button onClick={async () => { const r = await fetch(`/api/admin/users/${acc.id}`, { method: "DELETE", credentials: "include" }); if (r.ok) setAccounts(p => p.filter(a => a.id !== acc.id)); }} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── FOOTER ───────────────────────────────────────────────────────────────────
  const Footer = () => (
    <footer className="bg-black text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[#1A5C1A] flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-lg text-white">DO' MOTOCULTURE</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed" style={{ fontFamily: "'Barlow', sans-serif" }}>Votre spécialiste en réparation et pièces d'occasion pour matériels de motoculture.</p>
        </div>
        <div>
          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-sm tracking-wide mb-4 text-white">NAVIGATION</h4>
          <div className="space-y-2">
            {([
              { label: "Accueil", p: "home" as Page },
              { label: "Boutique", p: "shop" as Page },
              { label: "Réparations", p: "repairs" as Page },
              { label: "Rachat matériel", p: "buyback" as Page },
              { label: "Blog", p: "blog" as Page },
            ] as { label: string; p: Page }[]).map(({ label, p }) => (
              <button key={p} onClick={() => navigate(p)} className="block text-sm text-gray-400 hover:text-white transition-colors" style={{ fontFamily: "'Barlow', sans-serif" }}>{label}</button>
            ))}
          </div>
        </div>
        <div>
          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-sm tracking-wide mb-4 text-white">CONTACT</h4>
          <div className="space-y-1.5 text-sm text-gray-400" style={{ fontFamily: "'Barlow', sans-serif" }}>
            <p>+33 (0)6 12 34 56 78</p>
            <p>contact@domotoculture.fr</p>
            <p>12 rue des Artisans</p>
            <p>69000 Lyon</p>
          </div>
        </div>
        <div>
          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="font-bold text-sm tracking-wide mb-4 text-white">HORAIRES</h4>
          <div className="space-y-1 text-sm text-gray-400" style={{ fontFamily: "'Barlow', sans-serif" }}>
            <p>Lun–Ven : 8h00 – 18h00</p>
            <p>Samedi : 9h00 – 12h00</p>
            <p className="text-gray-600">Dimanche : Fermé</p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>© 2024 Do' Motoculture. Tous droits réservés.</p>
        <div className="flex items-center gap-3 text-xs text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <Lock className="w-3 h-3" />
          <span>Paiement sécurisé SSL</span>
          <span>·</span>
          <span>Powered by Stripe</span>
        </div>
      </div>
    </footer>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <Navbar />
      <CartSidebar />
      <main>
        {page === "home" && <HomePage />}
        {page === "shop" && <ShopPage />}
        {page === "repairs" && <RepairsPage />}
        {page === "buyback" && <BuybackPage />}
        {page === "blog" && <BlogPage />}
        {page === "post" && <BlogPostPage />}
        {page === "checkout" && <CheckoutPage />}
        {page === "admin" && <AdminPage />}
      </main>
      {page !== "admin" && <Footer />}
    </div>
  );
}

// ─── ICONS ────────────────────────────────────────────────────────────────────
// Every icon in the app goes through here (Lucide line icons).
import {
  Sun, Moon, Target, Feather, Wallet, CalendarDays, Calendar, User, Pencil, Pin, Search, Lock,
  TriangleAlert, PiggyBank, ListChecks, Trash2, AlarmClock, Coins, TrendingUp, StickyNote,
  ChartPie, ChartNoAxesColumn, List, ClipboardList, CalendarClock, Settings, X, Check,
  House, ShoppingCart, UtensilsCrossed, Car, HeartPulse, Tv, Gamepad2, Package, Briefcase,
  Eye, EyeOff, Smartphone, ShieldCheck, Lightbulb, Plus, Download,
} from "lucide-react";

const ICONS = {
  // tabs
  today:Sun, goals:Target, whisperer:Feather, budget:Wallet, calendar:CalendarDays, profile:User,
  // actions / meta
  edit:Pencil, pin:Pin, toGoal:Target, search:Search, lock:Lock, date:Calendar,
  warn:TriangleAlert, savings:PiggyBank, steps:ListChecks, trash:Trash2, close:X, check:Check, plus:Plus,
  // section titles
  urgent:AlarmClock, money:Coins, progress:TrendingUp, notes:StickyNote,
  transactions:List, breakdown:ChartPie, donut:ChartPie, bars:ChartNoAxesColumn,
  deadlines:ClipboardList, upcoming:CalendarClock, settings:Settings, target:Target, account:User, download:Download,
  moon:Moon, sun:Sun,
  // auth screen
  eye:Eye, eyeOff:EyeOff, phone:Smartphone, shield:ShieldCheck, idea:Lightbulb,
};

// Budget categories, by index (same order as T[lang].budgetCategories)
const CATS = [
  House, ShoppingCart, UtensilsCrossed, Car, HeartPulse,
  Tv, Gamepad2, Package, Briefcase, PiggyBank,
];

function render(Cmp, { size=16, color, strokeWidth=1.75, style, className }) {
  return <Cmp size={size} color={color || "currentColor"} strokeWidth={strokeWidth} className={className} aria-hidden="true"
    style={{ display:"inline-block", verticalAlign:"-0.15em", flexShrink:0, ...style }}/>;
}

export function Icon({ name, ...props }) {
  const def = ICONS[name];
  return def ? render(def, props) : null;
}

export function CatIcon({ idx, ...props }) {
  return render(CATS[idx] || CATS[7], props);
}

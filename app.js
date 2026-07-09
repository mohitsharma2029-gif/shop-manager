const {
  useState,
  useEffect,
  useCallback
} = React;

/* ── Google Fonts ── */
const FontLoader = () => /*#__PURE__*/React.createElement("style", null, `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
    * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
    .font-display { font-family: 'DM Sans', sans-serif; }
    .gradient-header { background: linear-gradient(135deg, #0F0A2E 0%, #1E1B4B 40%, #2D2576 100%); }
    .card-shadow { box-shadow: 0 1px 3px rgba(15,10,46,0.06), 0 4px 16px rgba(15,10,46,0.08); }
    .card-shadow-lg { box-shadow: 0 4px 6px rgba(15,10,46,0.05), 0 10px 40px rgba(15,10,46,0.12); }
    .btn-primary { background: linear-gradient(135deg, #4F46E5, #7C3AED); }
    .btn-primary:hover { background: linear-gradient(135deg, #4338CA, #6D28D9); }
    .btn-success { background: linear-gradient(135deg, #059669, #10B981); }
    .stat-card { background: linear-gradient(135deg, #1E1B4B, #2D2576); }
    .glow-green { box-shadow: 0 0 0 1px rgba(16,185,129,0.3), 0 4px 16px rgba(16,185,129,0.15); }
    .glow-rose { box-shadow: 0 0 0 1px rgba(244,63,94,0.3), 0 4px 16px rgba(244,63,94,0.15); }
    .nav-pill { background: linear-gradient(135deg, #4F46E5, #7C3AED); border-radius: 12px; }
    .input-field { border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 12px 16px; font-size: 14px; width: 100%; background: #fff; transition: border-color 0.2s; outline: none; }
    .input-field:focus { border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .badge-present { background: #DCFCE7; color: #15803D; }
    .badge-absent { background: #FFE4E8; color: #BE123C; }
    .badge-half { background: #FEF3C7; color: #B45309; }
    .badge-late { background: #FFEDD5; color: #C2410C; }
    .tab-active { background: #fff; color: #1E1B4B; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
    .tab-inactive { color: #94A3B8; }
    .att-present { background: #10B981; }
    .att-absent { background: #F43F5E; }
    .att-half { background: #FBBF24; }
    .att-late { background: #F97316; }
    .att-empty { background: #E8EDF8; }
    .slip-header { background: linear-gradient(135deg, #0F0A2E, #2D2576); }
    @media print { .no-print { display: none !important; } .print-only { display: block !important; } }
  `);

/* ── Storage — this is a real hosted website, so it always talks directly to Firestore ── */
const K = {
  S: "sm-staff-v2",
  A: "sm-att",
  P: "sm-pay",
  ST: "sm-settings",
  ADV: "sm-advances",
  COMM: "sm-commission"
};
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA12uMPpQU3klpk6WktImHsccfMfnYCKHU",
  projectId: "bhabhi-shop-manager"
};
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/shopdata`;
const sGet = async k => {
  try {
    const res = await fetch(`${FS_BASE}/${k}?key=${FIREBASE_CONFIG.apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    const json = data.fields?.json?.stringValue;
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('sGet failed', e);
    return null;
  }
};
const sSet = async (k, v) => {
  try {
    const body = {
      fields: {
        json: {
          stringValue: JSON.stringify(v)
        }
      }
    };
    const res = await fetch(`${FS_BASE}/${k}?key=${FIREBASE_CONFIG.apiKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return res.ok;
  } catch (e) {
    console.error('sSet failed', e);
    return false;
  }
};

/* ── Helpers ── */
const mKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const dKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mName = k => {
  const [y, m] = k.split('-');
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });
};
const dInM = k => {
  const [y, m] = k.split('-');
  return new Date(y, m, 0).getDate();
};
const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const dailyRate = s => Math.round((Number(s.monthlySalary) || 0) / 26);
const today = new Date();

/* Custom per-staff salary cycle: period runs from (payoutDay+1) of the previous month
   through payoutDay of the selected month — not the calendar 1st–31st. */
const cycleRange = (payoutDay, selMonth) => {
  const [y, m] = selMonth.split('-').map(Number);
  const pd = Math.max(1, Math.min(31, Number(payoutDay) || 1));
  const endDaysInMonth = new Date(y, m, 0).getDate();
  const endDate = new Date(y, m - 1, Math.min(pd, endDaysInMonth));
  let py = y,
    pm = m - 1;
  if (pm === 0) {
    pm = 12;
    py = y - 1;
  }
  const startDaysInMonth = new Date(py, pm, 0).getDate();
  const startDate = new Date(py, pm - 1, Math.min(pd + 1, startDaysInMonth));
  return {
    startDate,
    endDate
  };
};
const fmtShort = d => d.toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short'
});
const cycleLabel = (payoutDay, selMonth) => {
  const {
    startDate,
    endDate
  } = cycleRange(payoutDay, selMonth);
  return `${fmtShort(startDate)} – ${fmtShort(endDate)}`;
};
/* Pulls a staff's attendance records for their own cycle, spanning across month buckets if needed */
const getCycleAtt = (att, staffId, payoutDay, selMonth) => {
  const {
    startDate,
    endDate
  } = cycleRange(payoutDay, selMonth);
  const startK = dKey(startDate),
    endK = dKey(endDate);
  const monthsToCheck = new Set([mKey(startDate), mKey(endDate)]);
  const rec = {};
  monthsToCheck.forEach(mk => {
    const sa = (att[mk] || {})[staffId] || {};
    Object.keys(sa).forEach(dk => {
      if (dk >= startK && dk <= endK) rec[dk] = sa[dk];
    });
  });
  return rec;
};

/* ── Icons ── */
const Ic = {
  home: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "9,22 9,12 15,12 15,22"
  })),
  users: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
  })),
  cal: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  })),
  pay: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "5",
    width: "20",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "10",
    x2: "22",
    y2: "10"
  })),
  gear: /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
  })),
  plus: /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  })),
  edit: /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
  })),
  trash: /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "3,6 5,6 21,6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"
  })),
  dl: /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "8,17 12,21 16,17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "12",
    x2: "12",
    y2: "21"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.11"
  })),
  up: /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "16,16 12,12 8,16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "12",
    x2: "12",
    y2: "21"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"
  })),
  chk: /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "3",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20,6 9,17 4,12"
  })),
  arrow: /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12,5 19,12 12,19"
  })),
  finger: /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2C8.13 2 5 5.13 5 9v7c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 6c-1.66 0-3 1.34-3 3v7c0 1.66 1.34 3 3 3s3-1.34 3-3V9c0-1.66-1.34-3-3-3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 10c-.55 0-1 .45-1 1v5c0 .55.45 1 1 1s1-.45 1-1v-5c0-.55-.45-1-1-1z"
  }))
};

/* ── Reusable Components ── */
const Avatar = ({
  name,
  size = 40
}) => {
  const colors = ['#4F46E5', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626'];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      background: colors[idx],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.38,
      flexShrink: 0,
      fontFamily: 'DM Sans,sans-serif',
      letterSpacing: '-0.5px'
    }
  }, name?.[0]?.toUpperCase() || '?');
};
const Badge = ({
  status
}) => {
  if (!status) return /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      background: '#F1F5F9',
      color: '#94A3B8'
    }
  }, "Not Marked");
  const cls = {
    present: 'badge-present',
    absent: 'badge-absent',
    half: 'badge-half',
    late: 'badge-late'
  }[status] || '';
  return /*#__PURE__*/React.createElement("span", {
    className: cls,
    style: {
      fontSize: 11,
      fontWeight: 700,
      padding: '4px 12px',
      borderRadius: 20,
      textTransform: 'capitalize'
    }
  }, status === 'half' ? 'Half Day' : status);
};
const StatCard = ({
  label,
  value,
  sub,
  color = '#10B981',
  icon
}) => /*#__PURE__*/React.createElement("div", {
  className: "card-shadow",
  style: {
    background: '#fff',
    borderRadius: 16,
    padding: '16px',
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }
}, label), icon && /*#__PURE__*/React.createElement("span", {
  style: {
    color,
    opacity: 0.7
  }
}, icon)), /*#__PURE__*/React.createElement("div", {
  className: "font-display",
  style: {
    fontSize: 28,
    fontWeight: 800,
    color,
    lineHeight: 1
  }
}, value), sub && /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: 500
  }
}, sub));
const SectionLabel = ({
  children
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
    paddingLeft: 2
  }
}, children);
const Divider = () => /*#__PURE__*/React.createElement("div", {
  style: {
    height: 1,
    background: '#F1F5F9',
    margin: '16px 0'
  }
});

/* ── Main App ── */
function App() {
  const [page, setPage] = useState('dashboard');
  const [staff, setStaff] = useState([]);
  const [att, setAtt] = useState({});
  const [pay, setPay] = useState({});
  const [advances, setAdvances] = useState({});
  const [commission, setCommission] = useState({});
  const [settings, setSettings] = useState({
    shopName: 'My Shop',
    halfDayRate: 0.5,
    lateFine: 0
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const s = await sGet(K.S),
        a = await sGet(K.A),
        p = await sGet(K.P),
        st = await sGet(K.ST),
        adv = await sGet(K.ADV),
        cm = await sGet(K.COMM);
      if (s) {
        setStaff(s);
      } else {
        const defaultStaff = [{
          id: '1001',
          name: 'JITENDRA MANANI',
          phone: '',
          monthlySalary: 20000,
          bankName: '',
          accountNumber: '',
          ifsc: '',
          payoutDay: 7,
          commissionRate: 5
        }, {
          id: '1002',
          name: 'VICKY GULWANI',
          phone: '',
          monthlySalary: 14000,
          bankName: '',
          accountNumber: '',
          ifsc: '',
          payoutDay: 6,
          commissionRate: 5
        }, {
          id: '1003',
          name: 'MANISH PRAJAPAT',
          phone: '',
          monthlySalary: 14000,
          bankName: '',
          accountNumber: '',
          ifsc: '',
          payoutDay: 1,
          commissionRate: 0
        }, {
          id: '1004',
          name: 'HITESH SHARMA',
          phone: '',
          monthlySalary: 14000,
          bankName: '',
          accountNumber: '',
          ifsc: '',
          payoutDay: 25,
          commissionRate: 4
        }, {
          id: '1005',
          name: 'ZAIN HUSSAIN',
          phone: '',
          monthlySalary: 14000,
          bankName: '',
          accountNumber: '',
          ifsc: '',
          payoutDay: 4,
          commissionRate: 3
        }, {
          id: '1006',
          name: 'PURAB ASRET',
          phone: '',
          monthlySalary: 13000,
          bankName: '',
          accountNumber: '',
          ifsc: '',
          payoutDay: 2,
          commissionRate: 3
        }];
        setStaff(defaultStaff);
        await sSet(K.S, defaultStaff);
      }
      if (a) setAtt(a);
      if (p) setPay(p);
      if (st) setSettings(prev => ({
        ...prev,
        ...st
      }));
      if (adv) setAdvances(adv);
      if (cm) setCommission(cm);
      setLoading(false);
    })();
  }, []);
  const saveStaff = useCallback(async d => {
    setStaff(d);
    await sSet(K.S, d);
  }, []);
  const saveAtt = useCallback(async d => {
    setAtt(d);
    await sSet(K.A, d);
  }, []);
  const savePay = useCallback(async d => {
    setPay(d);
    await sSet(K.P, d);
  }, []);
  const saveAdvances = useCallback(async d => {
    setAdvances(d);
    await sSet(K.ADV, d);
  }, []);
  const saveCommission = useCallback(async d => {
    setCommission(d);
    return await sSet(K.COMM, d);
  }, []);
  const saveSettings = useCallback(async d => {
    setSettings(d);
    await sSet(K.ST, d);
  }, []);
  if (loading) return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement("div", {
    className: "gradient-header",
    style: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#8B5CF6',
      width: 48,
      height: 48
    }
  }, Ic.finger), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      color: '#fff',
      fontSize: 22,
      fontWeight: 800
    }
  }, "Shop Manager"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#6366F1',
      fontSize: 13
    }
  }, "Loading your data…")));
  const props = {
    staff,
    saveStaff,
    att,
    saveAtt,
    pay,
    savePay,
    advances,
    saveAdvances,
    commission,
    saveCommission,
    settings,
    saveSettings
  };
  const pages = {
    dashboard: /*#__PURE__*/React.createElement(Dashboard, {
      ...props,
      setPage: setPage
    }),
    staff: /*#__PURE__*/React.createElement(StaffPage, props),
    attendance: /*#__PURE__*/React.createElement(AttendancePage, props),
    payroll: /*#__PURE__*/React.createElement(PayrollPage, props),
    settings: /*#__PURE__*/React.createElement(SettingsPage, props)
  };
  const nav = [{
    id: 'dashboard',
    label: 'Home',
    icon: Ic.home
  }, {
    id: 'staff',
    label: 'Staff',
    icon: Ic.users
  }, {
    id: 'attendance',
    label: 'Attend.',
    icon: Ic.cal
  }, {
    id: 'payroll',
    label: 'Payroll',
    icon: Ic.pay
  }, {
    id: 'settings',
    label: 'Settings',
    icon: Ic.gear
  }];
  const mK = mKey(today);
  const mPay = pay[mK] || {};
  const pendingBadge = staff.filter(s => (mPay[s.id] || {}).calculated && !(mPay[s.id] || {}).approved).length;
  const dueTodayBadge = staff.filter(s => Number(s.payoutDay || 1) === today.getDate() && !(mPay[s.id] || {}).approved).length;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FontLoader, null), /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: '#F0F4FF',
      paddingBottom: 80
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "gradient-header no-print",
    style: {
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: 'rgba(139,92,246,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#A78BFA'
    }
  }, Ic.finger), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: '#6366F1',
      textTransform: 'uppercase',
      letterSpacing: '0.1em'
    }
  }, "Shop Manager Pro"), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontSize: 17,
      fontWeight: 800,
      color: '#fff',
      lineHeight: 1.2
    }
  }, settings.shopName))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#6366F1',
      fontWeight: 600
    }
  }, today.toLocaleDateString('en-IN', {
    weekday: 'short'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#C7D2FE',
      fontWeight: 700
    }
  }, today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  })))), /*#__PURE__*/React.createElement("div", null, pages[page] || pages.dashboard), /*#__PURE__*/React.createElement("nav", {
    className: "no-print",
    style: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#fff',
      borderTop: '1px solid #E8ECF8',
      display: 'flex',
      padding: '8px 4px 10px',
      zIndex: 30,
      boxShadow: '0 -4px 20px rgba(15,10,46,0.08)'
    }
  }, nav.map(({
    id,
    label,
    icon
  }) => {
    const active = page === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => setPage(id),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: '6px 4px',
        borderRadius: 12,
        position: 'relative',
        transition: 'all 0.15s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: active ? 'nav-pill' : '',
      style: {
        width: 36,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        color: active ? '#fff' : '#94A3B8',
        transition: 'all 0.2s',
        position: 'relative'
      }
    }, icon, id === 'payroll' && pendingBadge > 0 && !active && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -4,
        right: -4,
        background: '#F43F5E',
        color: '#fff',
        borderRadius: '50%',
        width: 14,
        height: 14,
        fontSize: 9,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, pendingBadge), id === 'dashboard' && dueTodayBadge > 0 && !active && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -4,
        right: -4,
        background: '#DC2626',
        color: '#fff',
        borderRadius: '50%',
        width: 14,
        height: 14,
        fontSize: 9,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, dueTodayBadge)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9.5,
        fontWeight: active ? 700 : 500,
        color: active ? '#4F46E5' : '#94A3B8',
        letterSpacing: '0.02em'
      }
    }, label));
  }))));
}

/* ── Dashboard ── */
function Dashboard({
  staff,
  att,
  pay,
  settings,
  setPage
}) {
  const todayK = dKey(today);
  const mK = mKey(today);
  const mAtt = att[mK] || {};
  const mPay = pay[mK] || {};
  const ct = s => staff.filter(st => (mAtt[st.id] || {})[todayK] === s).length;
  const notMarked = staff.filter(s => !(mAtt[s.id] || {})[todayK]).length;
  const approved = staff.filter(s => (mPay[s.id] || {}).approved);
  const totalPaid = approved.reduce((a, b) => a + (mPay[b.id]?.netSalary || 0), 0);
  const pending = staff.filter(s => (mPay[s.id] || {}).calculated && !(mPay[s.id] || {}).approved).length;
  const dueToday = staff.filter(s => Number(s.payoutDay || 1) === today.getDate() && !(mPay[s.id] || {}).approved);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 16px',
      maxWidth: 480,
      margin: '0 auto'
    }
  }, dueToday.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg,#DC2626,#F97316)',
      borderRadius: 20,
      padding: '18px',
      marginBottom: 20,
      boxShadow: '0 4px 20px rgba(220,38,38,0.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22
    }
  }, "🔔"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      color: '#fff',
      fontWeight: 800,
      fontSize: 15
    }
  }, "Salary Due Today!"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11
    }
  }, "Credit these before end of day"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      marginBottom: 12
    }
  }, dueToday.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 10,
      padding: '8px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff',
      fontWeight: 700,
      fontSize: 13
    }
  }, s.name), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#fff',
      fontWeight: 600,
      fontSize: 12,
      opacity: 0.9
    }
  }, fmt(s.monthlySalary), "/mo")))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage('payroll'),
    style: {
      width: '100%',
      border: 'none',
      background: '#fff',
      color: '#DC2626',
      fontWeight: 800,
      fontSize: 13,
      padding: '11px',
      borderRadius: 12,
      cursor: 'pointer',
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Go to Payroll & Pay Now ", Ic.arrow)), /*#__PURE__*/React.createElement("div", {
    className: "stat-card card-shadow-lg",
    style: {
      borderRadius: 20,
      padding: '20px',
      marginBottom: 20,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -20,
      right: -20,
      width: 100,
      height: 100,
      borderRadius: '50%',
      background: 'rgba(99,102,241,0.1)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: -30,
      right: 30,
      width: 80,
      height: 80,
      borderRadius: '50%',
      background: 'rgba(139,92,246,0.08)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6366F1',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 4
    }
  }, "Today's Attendance"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#6B7280',
      marginBottom: 20
    }
  }, today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 8
    }
  }, [['Present', ct('present'), '#10B981'], ['Absent', ct('absent'), '#F43F5E'], ['Half Day', ct('half'), '#FBBF24'], ['Unmarked', notMarked, '#6366F1']].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      textAlign: 'center',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '10px 4px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontSize: 26,
      fontWeight: 800,
      color: c,
      lineHeight: 1
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.45)',
      marginTop: 3,
      fontWeight: 500,
      lineHeight: 1.2
    }
  }, l)))), staff.length > 0 && notMarked > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage('attendance'),
    className: "btn-primary",
    style: {
      marginTop: 16,
      width: '100%',
      border: 'none',
      color: '#fff',
      fontWeight: 700,
      fontSize: 13,
      padding: '12px',
      borderRadius: 12,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Mark Today's Attendance ", Ic.arrow), staff.length > 0 && notMarked === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      background: 'rgba(16,185,129,0.15)',
      border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: 12,
      padding: '11px',
      textAlign: 'center',
      color: '#10B981',
      fontWeight: 700,
      fontSize: 13
    }
  }, "✓ All attendance marked for today")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Month Paid",
    value: fmt(totalPaid),
    sub: `${approved.length} of ${staff.length} approved`,
    color: "#4F46E5"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Pending",
    value: pending,
    sub: pending > 0 ? "Tap to review" : "All clear",
    color: pending > 0 ? "#F43F5E" : "#10B981"
  })), pending > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage('payroll'),
    style: {
      width: '100%',
      border: '1.5px solid #F43F5E',
      background: '#FFF0F3',
      color: '#BE123C',
      borderRadius: 14,
      padding: '12px',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, "⚠ ", pending, " salary approval", pending > 1 ? 's' : '', " pending ", Ic.arrow), /*#__PURE__*/React.createElement(SectionLabel, null, "Staff Members"), staff.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '40px 20px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      marginBottom: 12
    }
  }, "👥"), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 700,
      color: '#1E1B4B',
      fontSize: 16,
      marginBottom: 6
    }
  }, "No staff added yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#94A3B8',
      fontSize: 13,
      marginBottom: 20
    }
  }, "Add your staff members to start tracking attendance"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage('staff'),
    className: "btn-primary",
    style: {
      border: 'none',
      color: '#fff',
      fontWeight: 700,
      padding: '12px 28px',
      borderRadius: 12,
      cursor: 'pointer',
      fontSize: 13,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "+ Add First Staff Member")) : /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      overflow: 'hidden'
    }
  }, staff.map((s, i) => {
    const status = (mAtt[s.id] || {})[todayK];
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      style: {
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        gap: 12,
        borderBottom: i < staff.length - 1 ? '1px solid #F1F5F9' : 'none'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: s.name,
      size: 40
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: '#1E1B4B',
        fontSize: 14,
        marginBottom: 2
      }
    }, s.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: 500
      }
    }, fmt(s.monthlySalary), " / month")), /*#__PURE__*/React.createElement(Badge, {
      status: status
    }));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      borderTop: '1px solid #F1F5F9',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage('staff'),
    style: {
      background: 'none',
      border: 'none',
      color: '#6366F1',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, "Manage Staff →"))));
}

/* ── Staff Page ── */
function StaffPage({
  staff,
  saveStaff
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const blank = {
    name: '',
    phone: '',
    monthlySalary: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    payoutDay: 1,
    commissionRate: 0
  };
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const openAdd = () => {
    setForm(blank);
    setEditing(null);
    setErr('');
    setShowForm(true);
  };
  const openEdit = s => {
    setForm({
      ...s
    });
    setEditing(s.id);
    setErr('');
    setShowForm(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) {
      setErr('Name is required');
      return;
    }
    if (!form.monthlySalary || isNaN(form.monthlySalary)) {
      setErr('Enter a valid monthly salary');
      return;
    }
    if (editing) await saveStaff(staff.map(s => s.id === editing ? {
      ...form,
      id: editing
    } : s));else await saveStaff([...staff, {
      ...form,
      id: Date.now().toString()
    }]);
    setShowForm(false);
  };
  const handleDel = async id => {
    await saveStaff(staff.filter(s => s.id !== id));
    setConfirmDeleteId(null);
  };
  const Field = ({
    label,
    k,
    type = 'text',
    ph
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: form[k] || '',
    onChange: e => setForm(p => ({
      ...p,
      [k]: e.target.value
    })),
    placeholder: ph,
    className: "input-field"
  }));
  if (showForm) return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 16px',
      maxWidth: 480,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowForm(false),
    style: {
      background: '#F1F5F9',
      border: 'none',
      borderRadius: 10,
      padding: '8px 14px',
      fontWeight: 600,
      color: '#475569',
      cursor: 'pointer',
      fontSize: 13
    }
  }, "← Back"), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 18
    }
  }, editing ? 'Edit Staff Member' : 'Add Staff Member')), /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '20px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Personal Details"), /*#__PURE__*/React.createElement(Field, {
    label: "Full Name *",
    k: "name",
    ph: "e.g. Ramesh Kumar"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Phone Number",
    k: "phone",
    type: "tel",
    ph: "10-digit mobile number"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Monthly Salary (₹) *",
    k: "monthlySalary",
    type: "number",
    ph: "e.g. 14000"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Salary Date (Day of Month) *",
    k: "payoutDay",
    type: "number",
    ph: "e.g. 25 = salary due every 25th"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: -10,
      marginBottom: 16
    }
  }, "Payroll will calculate this staff's month as the day after last salary date to this date — not the calendar month."), /*#__PURE__*/React.createElement(Field, {
    label: "Commission Rate (%) on Sales",
    k: "commissionRate",
    type: "number",
    ph: "e.g. 5 (leave 0 if no commission)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '20px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Bank Details for Salary Transfer"), /*#__PURE__*/React.createElement(Field, {
    label: "Bank Name",
    k: "bankName",
    ph: "e.g. SBI, HDFC, ICICI"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Account Number",
    k: "accountNumber",
    ph: "Full bank account number"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "IFSC Code",
    k: "ifsc",
    ph: "e.g. SBIN0001234"
  })), err && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FFF0F3',
      border: '1.5px solid #F43F5E',
      borderRadius: 12,
      padding: '12px 16px',
      color: '#BE123C',
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 16
    }
  }, err), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    className: "btn-primary",
    style: {
      width: '100%',
      border: 'none',
      color: '#fff',
      fontWeight: 800,
      fontSize: 15,
      padding: '15px',
      borderRadius: 14,
      cursor: 'pointer',
      fontFamily: 'DM Sans,sans-serif'
    }
  }, editing ? 'Save Changes' : 'Add Staff Member'));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 16px',
      maxWidth: 480,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 22
    }
  }, "Staff Members"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: 500,
      marginTop: 2
    }
  }, staff.length, " of 7 slots used")), /*#__PURE__*/React.createElement("button", {
    onClick: openAdd,
    className: "btn-primary",
    style: {
      border: 'none',
      color: '#fff',
      fontWeight: 700,
      padding: '10px 18px',
      borderRadius: 12,
      cursor: 'pointer',
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, Ic.plus, " Add Staff")), staff.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '48px 24px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      marginBottom: 12
    }
  }, "👤"), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 700,
      color: '#1E1B4B',
      fontSize: 16,
      marginBottom: 8
    }
  }, "No staff yet"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#94A3B8',
      fontSize: 13
    }
  }, "Add your first staff member to begin")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, staff.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 16,
      padding: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: s.name,
    size: 44
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: '#1E1B4B',
      fontSize: 15,
      marginBottom: 2
    }
  }, s.name), s.phone && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#94A3B8',
      marginBottom: 4
    }
  }, "📞 ", s.phone), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      background: '#DCFCE7',
      color: '#15803D',
      fontSize: 12,
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 20
    }
  }, fmt(s.monthlySalary), " / month"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      background: '#EEF2FF',
      color: '#4F46E5',
      fontSize: 12,
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 20
    }
  }, "💰 ", s.payoutDay || 1, s.payoutDay === 1 ? 'st' : s.payoutDay === 2 ? 'nd' : s.payoutDay === 3 ? 'rd' : 'th', " of month"), Number(s.commissionRate) > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-block',
      background: '#FCE7F3',
      color: '#BE185D',
      fontSize: 12,
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 20
    }
  }, "🎯 ", s.commissionRate, "% commission")), s.bankName && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      background: '#F8FAFF',
      borderRadius: 10,
      padding: '8px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: 600
    }
  }, s.bankName, s.accountNumber ? ` · ****${s.accountNumber.slice(-4)}` : ''), s.ifsc && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 2
    }
  }, "IFSC: ", s.ifsc))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => openEdit(s),
    style: {
      background: '#F1F5F9',
      border: 'none',
      borderRadius: 8,
      padding: '7px',
      cursor: 'pointer',
      color: '#64748B',
      display: 'flex'
    }
  }, Ic.edit), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmDeleteId(s.id),
    style: {
      background: '#FFF0F3',
      border: 'none',
      borderRadius: 8,
      padding: '7px',
      cursor: 'pointer',
      color: '#F43F5E',
      display: 'flex'
    }
  }, Ic.trash)))))), confirmDeleteId && /*#__PURE__*/React.createElement("div", {
    onClick: () => setConfirmDeleteId(null),
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,10,46,0.5)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    className: "card-shadow-lg",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '24px',
      width: '100%',
      maxWidth: 360,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 10
    }
  }, "⚠️"), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 16,
      marginBottom: 6
    }
  }, "Delete Staff Member?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#6B7280',
      marginBottom: 20
    }
  }, staff.find(s => s.id === confirmDeleteId)?.name, " will be permanently removed. This cannot be undone."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmDeleteId(null),
    style: {
      flex: 1,
      border: '1.5px solid #E2E8F0',
      background: '#fff',
      color: '#64748B',
      borderRadius: 12,
      padding: '12px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 14
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDel(confirmDeleteId),
    style: {
      flex: 1,
      border: 'none',
      background: '#F43F5E',
      color: '#fff',
      borderRadius: 12,
      padding: '12px',
      fontWeight: 800,
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Delete")))));
}

/* ── Attendance Page ── */
function AttendancePage({
  staff,
  att,
  saveAtt,
  settings
}) {
  const [selMonth, setSelMonth] = useState(mKey(today));
  const [selDate, setSelDate] = useState(dKey(today));
  const [view, setView] = useState('daily');
  const dateMonth = selDate.slice(0, 7); // month bucket derived from the actual picked date — fixes back-dating
  const dAtt = att[dateMonth] || {}; // used for daily marking so it always matches the picked date
  const mAtt = att[selMonth] || {}; // used for monthly heatmap view & CSV, tied to the dropdown
  const days = dInM(selMonth);
  const months = Array.from({
    length: 12
  }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return mKey(d);
  });
  const handleDateChange = v => {
    setSelDate(v);
    setSelMonth(v.slice(0, 7));
  };
  const shiftDateStr = (dateStr, delta) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return dKey(dt);
  };
  const isSunday = dateStr => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).getDay() === 0;
  };
  const selIsSunday = isSunday(selDate);
  const setStatus = async (staffId, status) => {
    if (selIsSunday) return; // Sunday wages are paid in cash — no monthly attendance tracked
    const prev = (dAtt[staffId] || {})[selDate];
    const ns = prev === status ? undefined : status;
    const staffAtt = {
      ...(dAtt[staffId] || {})
    };
    if (ns) staffAtt[selDate] = ns;else delete staffAtt[selDate];
    await saveAtt({
      ...att,
      [dateMonth]: {
        ...dAtt,
        [staffId]: staffAtt
      }
    });
  };
  const markAll = async status => {
    if (selIsSunday) return;
    const updates = {};
    staff.forEach(s => {
      updates[s.id] = {
        ...(dAtt[s.id] || {}),
        [selDate]: status
      };
    });
    await saveAtt({
      ...att,
      [dateMonth]: {
        ...dAtt,
        ...updates
      }
    });
  };
  const handleCSV = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n').slice(1);
    /* Group rows by the actual month each date belongs to, so back-dated CSV rows land in the correct bucket. Sundays are skipped since wages are paid in cash that day. */
    const byMonth = {};
    let count = 0;
    let skippedSun = 0;
    lines.forEach(line => {
      const [nameOrId, date, status] = line.split(',').map(s => s.trim().replace(/"/g, ''));
      const sm = staff.find(s => s.id === nameOrId || s.name.toLowerCase() === nameOrId.toLowerCase());
      if (sm && date && ['present', 'absent', 'half', 'late'].includes(status?.toLowerCase())) {
        if (isSunday(date)) {
          skippedSun++;
          return;
        }
        const mk = date.slice(0, 7);
        if (!byMonth[mk]) byMonth[mk] = {};
        if (!byMonth[mk][sm.id]) byMonth[mk][sm.id] = {
          ...(att[mk]?.[sm.id] || {})
        };
        byMonth[mk][sm.id][date] = status.toLowerCase();
        count++;
      }
    });
    let merged = {
      ...att
    };
    Object.keys(byMonth).forEach(mk => {
      merged[mk] = {
        ...(merged[mk] || {}),
        ...byMonth[mk]
      };
    });
    await saveAtt(merged);
    alert(`✅ Imported ${count} attendance records!${skippedSun > 0 ? ` (Skipped ${skippedSun} Sunday entries — paid in cash)` : ''}`);
    e.target.value = '';
  };
  const dlSample = () => {
    const rows = ['Name,Date,Status', ...staff.map(s => `${s.name},${dKey(today)},present`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], {
      type: 'text/csv'
    }));
    a.download = 'sample_attendance.csv';
    a.click();
  };
  const cntSt = (sid, st) => Object.values(mAtt[sid] || {}).filter(v => v === st).length;
  const calcPrev = s => {
    const p = cntSt(s.id, 'present'),
      h = cntSt(s.id, 'half'),
      l = cntSt(s.id, 'late'),
      w = dailyRate(s);
    return (p + l) * w + h * w * settings.halfDayRate - l * Number(settings.lateFine);
  };
  const attBtnStyle = (cur, st, activeGrad, activeColor) => ({
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    borderRadius: 10,
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'DM Sans,sans-serif',
    background: cur === st ? activeGrad : '#F1F5F9',
    color: cur === st ? activeColor : '#94A3B8',
    transform: cur === st ? 'scale(0.96)' : 'scale(1)',
    transition: 'all 0.12s',
    boxShadow: cur === st ? `0 2px 8px rgba(0,0,0,0.15)` : 'none'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 16px',
      maxWidth: 480,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 22,
      marginBottom: 16
    }
  }, "Attendance"), /*#__PURE__*/React.createElement("select", {
    value: selMonth,
    onChange: e => setSelMonth(e.target.value),
    className: "input-field",
    style: {
      marginBottom: 16,
      fontWeight: 600
    }
  }, months.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mName(m)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: '#E8ECF8',
      borderRadius: 14,
      padding: 4,
      gap: 4,
      marginBottom: 20
    }
  }, [['daily', '📅 Daily'], ['monthly', '📊 Monthly'], ['upload', '📤 Upload CSV']].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setView(v),
    className: view === v ? 'tab-active' : 'tab-inactive',
    style: {
      flex: 1,
      border: 'none',
      borderRadius: 10,
      padding: '9px 4px',
      fontSize: 11.5,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'all 0.15s',
      fontFamily: 'Inter,sans-serif'
    }
  }, l))), view === 'daily' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Select Date"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDateChange(shiftDateStr(selDate, -1)),
    style: {
      border: '1.5px solid #E2E8F0',
      background: '#fff',
      color: '#4F46E5',
      borderRadius: 12,
      width: 44,
      height: 44,
      fontSize: 18,
      fontWeight: 800,
      cursor: 'pointer',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, "‹"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: selDate,
    onChange: e => handleDateChange(e.target.value),
    max: dKey(today),
    className: "input-field",
    style: {
      fontWeight: 600,
      textAlign: 'center'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDateChange(shiftDateStr(selDate, 1)),
    disabled: selDate >= dKey(today),
    style: {
      border: '1.5px solid #E2E8F0',
      background: selDate >= dKey(today) ? '#F8FAFF' : '#fff',
      color: selDate >= dKey(today) ? '#CBD5E1' : '#4F46E5',
      borderRadius: 12,
      width: 44,
      height: 44,
      fontSize: 18,
      fontWeight: 800,
      cursor: selDate >= dKey(today) ? 'default' : 'pointer',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, "›")), selDate !== dKey(today) && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDateChange(dKey(today)),
    style: {
      marginTop: 8,
      background: 'none',
      border: 'none',
      color: '#6366F1',
      fontWeight: 700,
      fontSize: 12,
      cursor: 'pointer',
      padding: 0
    }
  }, "← Jump back to Today")), selIsSunday && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEF3C7',
      border: '1.5px solid #FDE68A',
      borderRadius: 14,
      padding: '14px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20
    }
  }, "💵"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: '#92400E',
      fontSize: 13
    }
  }, "Sunday — Paid in Cash"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#B45309',
      marginTop: 1
    }
  }, "Attendance marking is disabled for Sundays since wages are settled separately."))), staff.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 16,
      opacity: selIsSunday ? 0.5 : 1,
      pointerEvents: selIsSunday ? 'none' : 'auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => markAll('present'),
    disabled: selIsSunday,
    style: {
      flex: 1,
      border: 'none',
      background: '#DCFCE7',
      color: '#15803D',
      borderRadius: 12,
      padding: '11px',
      fontWeight: 700,
      cursor: selIsSunday ? 'default' : 'pointer',
      fontSize: 13
    }
  }, "✅ All Present"), /*#__PURE__*/React.createElement("button", {
    onClick: () => markAll('absent'),
    disabled: selIsSunday,
    style: {
      flex: 1,
      border: 'none',
      background: '#FFE4E8',
      color: '#BE123C',
      borderRadius: 12,
      padding: '11px',
      fontWeight: 700,
      cursor: selIsSunday ? 'default' : 'pointer',
      fontSize: 13
    }
  }, "❌ All Absent")), staff.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '40px',
      textAlign: 'center',
      color: '#94A3B8',
      fontSize: 14
    }
  }, "Add staff members first") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, staff.map(s => {
    const status = (dAtt[s.id] || {})[selDate];
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: "card-shadow",
      style: {
        background: '#fff',
        borderRadius: 16,
        padding: '16px',
        opacity: selIsSunday ? 0.55 : 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: s.name,
      size: 38
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: '#1E1B4B',
        fontSize: 14
      }
    }, s.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: 500
      }
    }, fmt(s.monthlySalary), "/month")), /*#__PURE__*/React.createElement(Badge, {
      status: status
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8,
        pointerEvents: selIsSunday ? 'none' : 'auto'
      }
    }, [['present', 'P', 'linear-gradient(135deg,#059669,#10B981)', '#fff'], ['absent', 'A', 'linear-gradient(135deg,#E11D48,#F43F5E)', '#fff'], ['half', 'H', 'linear-gradient(135deg,#D97706,#FBBF24)', '#fff'], ['late', 'L', 'linear-gradient(135deg,#C2410C,#F97316)', '#fff']].map(([st, lbl, grad, clr]) => /*#__PURE__*/React.createElement("button", {
      key: st,
      onClick: () => setStatus(s.id, st),
      disabled: selIsSunday,
      style: attBtnStyle(status, st, grad, clr)
    }, lbl))));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      textAlign: 'center',
      marginTop: 4
    }
  }, "P = Present · A = Absent · H = Half Day · L = Late · Tap again to unmark"))), view === 'monthly' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, staff.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      color: '#94A3B8',
      padding: '40px 0'
    }
  }, "Add staff members first") : staff.map(s => {
    const rec = mAtt[s.id] || {};
    const p = cntSt(s.id, 'present'),
      h = cntSt(s.id, 'half'),
      l = cntSt(s.id, 'late'),
      a = cntSt(s.id, 'absent');
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: "card-shadow",
      style: {
        background: '#fff',
        borderRadius: 20,
        padding: '16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: s.name,
      size: 40
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: '#1E1B4B',
        fontSize: 15
      }
    }, s.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#94A3B8'
      }
    }, fmt(s.monthlySalary), "/month")), /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        fontSize: 18,
        fontWeight: 800,
        color: '#4F46E5'
      }
    }, fmt(calcPrev(s)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8,
        marginBottom: 14
      }
    }, [['P', p, '#059669', '#DCFCE7'], ['A', a, '#BE123C', '#FFE4E8'], ['H', h, '#B45309', '#FEF3C7'], ['L', l, '#C2410C', '#FFEDD5']].map(([lb, v, c, bg]) => /*#__PURE__*/React.createElement("div", {
      key: lb,
      style: {
        background: bg,
        borderRadius: 10,
        padding: '8px 4px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        fontWeight: 800,
        fontSize: 20,
        color: c
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: c,
        fontWeight: 600,
        opacity: 0.8
      }
    }, lb === 'P' ? 'Present' : lb === 'A' ? 'Absent' : lb === 'H' ? 'Half' : 'Late')))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: 600,
        marginBottom: 6
      }
    }, "ATTENDANCE HEATMAP"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7,1fr)',
        gap: 3
      }
    }, Array.from({
      length: days
    }, (_, i) => {
      const d = String(i + 1).padStart(2, '0');
      const dk = `${selMonth}-${d}`;
      const sun = isSunday(dk);
      const st = rec[dk];
      const bg = sun ? '#EDE9FE' : st === 'present' ? '#10B981' : st === 'absent' ? '#F43F5E' : st === 'half' ? '#FBBF24' : st === 'late' ? '#F97316' : '#E8EDF8';
      return /*#__PURE__*/React.createElement("div", {
        key: d,
        title: sun ? `${i + 1}: Sunday — cash pay` : `${i + 1}: ${st || '—'}`,
        style: {
          height: 22,
          borderRadius: 5,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 700,
          color: sun ? '#7C3AED' : st ? '#fff' : '#C4C9D8',
          cursor: 'default',
          transition: 'transform 0.1s'
        }
      }, sun ? '₹' : i + 1);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        marginTop: 10,
        flexWrap: 'wrap'
      }
    }, [['#10B981', 'Present'], ['#F43F5E', 'Absent'], ['#FBBF24', 'Half'], ['#F97316', 'Late'], ['#E8EDF8', '—'], ['#EDE9FE', 'Sunday (cash)']].map(([c, l]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: 500
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: c
      }
    }), l))));
  })), view === 'upload' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 16,
      marginBottom: 4
    }
  }, "Import from Fingerprint Device"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#94A3B8',
      marginBottom: 20
    }
  }, "Export from ZKTeco / eSSL and upload here"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFF',
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6366F1',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  }, "Required CSV Format"), /*#__PURE__*/React.createElement("code", {
    style: {
      fontSize: 12,
      color: '#1E1B4B',
      fontWeight: 600,
      display: 'block',
      background: '#EEF2FF',
      padding: '8px 12px',
      borderRadius: 8,
      letterSpacing: '0.02em'
    }
  }, "Name, Date (YYYY-MM-DD), Status"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 8
    }
  }, "Status values: ", /*#__PURE__*/React.createElement("strong", null, "present"), ", ", /*#__PURE__*/React.createElement("strong", null, "absent"), ", ", /*#__PURE__*/React.createElement("strong", null, "half"), ", ", /*#__PURE__*/React.createElement("strong", null, "late"))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      border: '2px dashed #C7D2FE',
      borderRadius: 16,
      padding: '32px 16px',
      cursor: 'pointer',
      background: '#F8FAFF',
      transition: 'all 0.2s'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      background: '#EEF2FF',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#6366F1'
    }
  }, Ic.up), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: '#1E1B4B',
      fontSize: 14
    }
  }, "Tap to Upload CSV"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#94A3B8'
    }
  }, "From your fingerprint device export"), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".csv,.txt",
    onChange: handleCSV,
    style: {
      display: 'none'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: dlSample,
    style: {
      marginTop: 14,
      background: 'none',
      border: 'none',
      color: '#6366F1',
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: 0
    }
  }, Ic.dl, " Download sample template")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#EFF6FF',
      border: '1px solid #BFDBFE',
      borderRadius: 16,
      padding: '16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: '#1D4ED8',
      fontSize: 13,
      marginBottom: 8
    }
  }, "📋 Steps to export from ZKTeco / eSSL"), ['Connect device to laptop via USB or LAN cable', 'Open the device manager software (comes in the box)', 'Go to Reports → Attendance → Export as CSV', 'Upload that file here — names will be matched automatically'].map((step, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 6,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: '#3B82F6',
      color: '#fff',
      fontSize: 11,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1
    }
  }, i + 1), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#1E40AF',
      lineHeight: 1.5
    }
  }, step))))));
}

/* ── Payroll Page ── */
function PayrollPage({
  staff,
  att,
  pay,
  savePay,
  advances,
  saveAdvances,
  commission,
  saveCommission,
  settings
}) {
  const [selMonth, setSelMonth] = useState(mKey(today));
  const [showSlip, setShowSlip] = useState(null);
  const [showAdvForm, setShowAdvForm] = useState(false);
  const [advForm, setAdvForm] = useState({
    staffId: '',
    amount: '',
    date: dKey(today),
    note: ''
  });
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [salesForm, setSalesForm] = useState({
    staffId: '',
    amount: '',
    period: '',
    note: ''
  });
  const [showPayoutForm, setShowPayoutForm] = useState(null); // staffId or null
  const [showLedger, setShowLedger] = useState(null); // staffId or null
  const [confirmClearCommission, setConfirmClearCommission] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const months = Array.from({
    length: 12
  }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return mKey(d);
  });
  const commStaff = staff.filter(s => Number(s.commissionRate) > 0);
  const cSales = sid => commission[sid]?.sales || [];
  const fmtSalesRange = entry => {
    if (!entry.dateFrom || !entry.dateTo) return entry.period;
    const f = new Date(entry.dateFrom),
      t = new Date(entry.dateTo);
    if (entry.dateFrom === entry.dateTo) return t.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const sameMonth = f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();
    const fStr = f.toLocaleDateString('en-IN', sameMonth ? {
      day: 'numeric'
    } : {
      day: 'numeric',
      month: 'short'
    });
    const tStr = t.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return `${fStr} – ${tStr}`;
  };
  const cPayouts = sid => commission[sid]?.payouts || [];
  const totalSales = sid => cSales(sid).reduce((a, b) => a + Number(b.amount || 0), 0);
  const commissionEarned = s => Math.round(totalSales(s.id) * (Number(s.commissionRate) || 0) / 100);
  const totalPaidOut = sid => cPayouts(sid).reduce((a, b) => a + Number(b.amount || 0), 0);
  const balanceDue = s => commissionEarned(s) - totalPaidOut(s.id);
  const openSalesForm = (staffId = '') => {
    setSalesForm({
      staffId,
      amount: '',
      period: mName(mKey(today)),
      note: ''
    });
    setShowSalesForm(true);
  };
  const handleAddSales = async () => {
    if (!salesForm.staffId || !salesForm.amount || isNaN(salesForm.amount) || Number(salesForm.amount) <= 0) return;
    const rec = commission[salesForm.staffId] || {
      sales: [],
      payouts: []
    };
    const list = [...rec.sales, {
      id: Date.now().toString(),
      amount: Number(salesForm.amount),
      period: salesForm.period,
      date: dKey(today),
      note: salesForm.note
    }];
    await saveCommission({
      ...commission,
      [salesForm.staffId]: {
        ...rec,
        sales: list
      }
    });
    setShowSalesForm(false);
  };
  const handleDelSales = async (staffId, id) => {
    const rec = commission[staffId] || {
      sales: [],
      payouts: []
    };
    await saveCommission({
      ...commission,
      [staffId]: {
        ...rec,
        sales: rec.sales.filter(x => x.id !== id)
      }
    });
  };
  const openPayoutForm = staffId => {
    setPayoutAmount('');
    setShowPayoutForm(staffId);
  };
  const handlePayout = async () => {
    const s = staff.find(x => x.id === showPayoutForm);
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0) return;
    const rec = commission[showPayoutForm] || {
      sales: [],
      payouts: []
    };
    const list = [...rec.payouts, {
      id: Date.now().toString(),
      amount: amt,
      date: dKey(today)
    }];
    await saveCommission({
      ...commission,
      [showPayoutForm]: {
        ...rec,
        payouts: list
      }
    });
    setShowPayoutForm(null);
  };
  const handleDelPayout = async (staffId, id) => {
    const rec = commission[staffId] || {
      sales: [],
      payouts: []
    };
    await saveCommission({
      ...commission,
      [staffId]: {
        ...rec,
        payouts: rec.payouts.filter(x => x.id !== id)
      }
    });
  };
  const handleClearCommission = async () => {
    const ok = await saveCommission({});
    setConfirmClearCommission(false);
    if (ok) {
      alert('✅ Commission data cleared. If you still see old entries after this, close and reopen the app fully (not just this tab) before re-importing.');
    } else {
      alert('⚠ Clear failed to save — please try again. If it keeps failing, this device\'s storage may be full or blocked.');
    }
  };
  const handleSalesCSV = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rawLines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').trim().split('\n').filter(l => l.trim());
    /* SSMS's "Save Results As CSV" exports data-only, no header row — while Power BI's export includes one. Detect which by checking if column 2 of row 1 is a number (data) or text like "SalesAmount"/"Year" (header). */
    const firstRowCols = rawLines[0].split(',').map(x => x.trim().replace(/"/g, ''));
    const hasHeader = isNaN(Number(firstRowCols[1]));
    const header = hasHeader ? firstRowCols.map(h => h.toLowerCase()) : [];
    const lines = hasHeader ? rawLines.slice(1) : rawLines;
    let updated = {
      ...commission
    };
    let count = 0;

    /* Matches "HITESH" from a Power BI export against staff record "HITESH SHARMA" — first-name / partial match, not exact-only. NICKNAMES covers cases where RetailGraph uses a name that doesn't overlap at all with the staff record (e.g. "JITU" for "JITENDRA MANANI"). */
    const NICKNAMES = {
      jitu: 'jitendra manani'
    };
    const findStaff = rawName => {
      if (!rawName) return null;
      const n = rawName.trim().toLowerCase();
      if (NICKNAMES[n]) {
        const s = staff.find(x => x.name.toLowerCase() === NICKNAMES[n]);
        if (s) return s;
      }
      return staff.find(s => s.id === rawName) || staff.find(s => s.name.toLowerCase() === n) || staff.find(s => s.name.toLowerCase().split(' ')[0] === n) || staff.find(s => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase().split(' ')[0]));
    };

    /* Detect raw Power BI line-item export (SalesmanName, Month, Year, Day, ID Sales, ...) vs the simple pre-summarized format */
    const idxSalesman = header.findIndex(h => h.includes('salesman') || h === 'name');
    const idxSales = header.findIndex(h => h === 'id sales' || h.includes('sales') && !h.includes('salesman'));
    const idxMonth = header.findIndex(h => h === 'month');
    const idxYear = header.findIndex(h => h === 'year');
    const idxDay = header.findIndex(h => h === 'day');
    const isRawExport = idxSalesman >= 0 && idxSales >= 0 && header.includes('entryno');
    const monthNum = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12
    };
    if (isRawExport) {
      /* Aggregate: sum ID Sales per (Salesman, Month, Year), and track the actual min/max transaction date within that group from the Year/Month/Day columns */
      const groups = {};
      lines.forEach(line => {
        const cols = line.split(',').map(x => x?.trim().replace(/"/g, ''));
        const name = cols[idxSalesman];
        const salesVal = Number(cols[idxSales]);
        if (!name || isNaN(salesVal)) return;
        const month = idxMonth >= 0 ? cols[idxMonth] : '';
        const year = idxYear >= 0 ? cols[idxYear] : '';
        const day = idxDay >= 0 ? Number(cols[idxDay]) : null;
        const period = month || year ? `${month} ${year}`.trim() : mName(mKey(today));
        const key = `${name.toLowerCase()}|${period}`;
        if (!groups[key]) groups[key] = {
          name,
          period,
          total: 0,
          dates: []
        };
        groups[key].total += salesVal;
        const mn = monthNum[(month || '').toLowerCase()];
        if (mn && year && day) groups[key].dates.push(`${year}-${String(mn).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      });
      Object.values(groups).forEach(g => {
        const sm = findStaff(g.name);
        if (sm && g.total > 0) {
          const rec = updated[sm.id] || {
            sales: [],
            payouts: []
          };
          const sortedDates = g.dates.sort();
          const dateFrom = sortedDates[0] || null;
          const dateTo = sortedDates[sortedDates.length - 1] || null;
          updated[sm.id] = {
            ...rec,
            sales: [...rec.sales, {
              id: Date.now().toString() + Math.random(),
              amount: Math.round(g.total),
              period: g.period,
              dateFrom,
              dateTo,
              date: dKey(today),
              note: 'Auto-summed from Power BI export'
            }]
          };
          count++;
        }
      });
    } else {
      lines.forEach(line => {
        const [nameOrId, amount, period, note, dFrom, dTo] = line.split(',').map(x => x?.trim().replace(/"/g, ''));
        const sm = findStaff(nameOrId);
        if (sm && amount && !isNaN(amount) && Number(amount) > 0) {
          const rec = updated[sm.id] || {
            sales: [],
            payouts: []
          };
          const validDate = s => s && /^\d{4}-\d{2}-\d{2}$/.test(s);
          updated[sm.id] = {
            ...rec,
            sales: [...rec.sales, {
              id: Date.now().toString() + Math.random(),
              amount: Number(amount),
              period: period || mName(mKey(today)),
              dateFrom: validDate(dFrom) ? dFrom : null,
              dateTo: validDate(dTo) ? dTo : null,
              date: dKey(today),
              note: note || ''
            }]
          };
          count++;
        }
      });
    }
    await saveCommission(updated);
    alert(count > 0 ? `✅ Imported commission-sales for ${count} staff/period record${count > 1 ? 's' : ''}!${isRawExport ? ' (Auto-totaled from raw Power BI export)' : ''}` : `⚠ No matching staff names found in this file. Check that names match exactly (e.g. "HITESH" vs "HITESH SHARMA").`);
    e.target.value = '';
  };
  const dlSalesSample = () => {
    const rows = ['Name,Sales Amount,Period,Note', ...commStaff.map(s => `${s.name},50000,${mName(mKey(today))},From Power BI export`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], {
      type: 'text/csv'
    }));
    a.download = 'sample_sales_for_commission.csv';
    a.click();
  };
  const mPay = pay[selMonth] || {};
  const mAdv = advances[selMonth] || {};
  const totalAdvance = sid => (mAdv[sid] || []).reduce((a, b) => a + Number(b.amount || 0), 0);
  const openAdvForm = (staffId = '') => {
    setAdvForm({
      staffId,
      amount: '',
      date: dKey(today),
      note: ''
    });
    setShowAdvForm(true);
  };
  const handleAddAdvance = async () => {
    if (!advForm.staffId || !advForm.amount || isNaN(advForm.amount) || Number(advForm.amount) <= 0) return;
    const list = [...(mAdv[advForm.staffId] || []), {
      id: Date.now().toString(),
      amount: Number(advForm.amount),
      date: advForm.date,
      note: advForm.note
    }];
    await saveAdvances({
      ...advances,
      [selMonth]: {
        ...mAdv,
        [advForm.staffId]: list
      }
    });
    setShowAdvForm(false);
  };
  const handleDelAdvance = async (staffId, advId) => {
    const list = (mAdv[staffId] || []).filter(x => x.id !== advId);
    await saveAdvances({
      ...advances,
      [selMonth]: {
        ...mAdv,
        [staffId]: list
      }
    });
  };
  const calcSal = s => {
    const rec = getCycleAtt(att, s.id, s.payoutDay || 1, selMonth);
    const present = Object.values(rec).filter(v => v === 'present').length;
    const half = Object.values(rec).filter(v => v === 'half').length;
    const late = Object.values(rec).filter(v => v === 'late').length;
    const absent = Object.values(rec).filter(v => v === 'absent').length;
    const w = dailyRate(s);
    const gross = (present + late) * w + half * w * settings.halfDayRate;
    const lateFine = late * Number(settings.lateFine);
    const advanceDeduction = totalAdvance(s.id);
    return {
      present,
      half,
      late,
      absent,
      gross,
      lateFine,
      advanceDeduction,
      netSalary: Math.max(0, gross - lateFine - advanceDeduction)
    };
  };
  const handleCalc = async () => {
    const updated = {
      ...mPay
    };
    staff.forEach(s => {
      const c = calcSal(s);
      updated[s.id] = {
        ...c,
        calculated: true,
        approved: (mPay[s.id] || {}).approved || false,
        staffName: s.name
      };
    });
    await savePay({
      ...pay,
      [selMonth]: updated
    });
  };
  const handleApprove = async id => {
    await savePay({
      ...pay,
      [selMonth]: {
        ...mPay,
        [id]: {
          ...mPay[id],
          approved: true,
          approvedOn: new Date().toISOString()
        }
      }
    });
  };
  const handleUnapprove = async id => {
    await savePay({
      ...pay,
      [selMonth]: {
        ...mPay,
        [id]: {
          ...mPay[id],
          approved: false,
          approvedOn: null
        }
      }
    });
  };
  const handleApproveAll = async () => {
    const updated = {
      ...mPay
    };
    Object.keys(updated).forEach(id => {
      updated[id] = {
        ...updated[id],
        approved: true,
        approvedOn: new Date().toISOString()
      };
    });
    await savePay({
      ...pay,
      [selMonth]: updated
    });
  };
  const exportCSV = () => {
    const rows = ['Staff Name,Bank Name,Account Number,IFSC Code,Net Salary (INR)'];
    staff.filter(s => (mPay[s.id] || {}).approved).forEach(s => {
      const p = mPay[s.id];
      rows.push(`${s.name},${s.bankName || ''},${s.accountNumber || ''},${s.ifsc || ''},${p.netSalary}`);
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], {
      type: 'text/csv'
    }));
    a.download = `salary_${selMonth}.csv`;
    a.click();
  };
  const calc = Object.keys(mPay).length > 0;
  const anyApproved = staff.some(s => (mPay[s.id] || {}).approved);
  const allApproved = staff.length > 0 && staff.every(s => (mPay[s.id] || {}).approved);
  const totalPayable = Object.values(mPay).reduce((a, b) => a + (b.netSalary || 0), 0);
  const pendingCount = staff.filter(s => (mPay[s.id] || {}).calculated && !(mPay[s.id] || {}).approved).length;

  /* Commission Ledger View — grouped by week, with running balance */
  if (showLedger) {
    const s = staff.find(st => st.id === showLedger);
    if (!s) {
      setShowLedger(null);
      return null;
    }
    const rate = Number(s.commissionRate) || 0;

    /* Week = Monday to Saturday, derived from each entry's actual sales/payout date (not the import date) */
    const weekInfo = dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const day = dt.getDay();
      const monday = new Date(dt);
      monday.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5); // Mon–Sat week (Sunday excluded — cash-paid separately)
      const fmtD = (dd, withYear) => dd.toLocaleDateString('en-IN', withYear ? {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      } : {
        day: 'numeric',
        month: 'short'
      });
      return {
        key: dKey(monday),
        label: `${fmtD(monday, false)} – ${fmtD(saturday, true)}`
      };
    };
    const entries = [...cSales(s.id).map(x => {
      const spansWeeks = x.dateFrom && x.dateTo && weekInfo(x.dateFrom).key !== weekInfo(x.dateTo).key;
      return {
        date: x.dateFrom || x.date,
        importedOn: x.date,
        type: 'sales',
        label: `Sales Recorded — ${fmtSalesRange(x)}${x.note && !x.dateFrom ? ` (${x.note})` : ''}${spansWeeks ? ' ⚠️ spans multiple weeks' : ''}`,
        salesAmt: x.amount,
        delta: Math.round(x.amount * rate / 100)
      };
    }), ...cPayouts(s.id).map(x => ({
      date: x.date,
      importedOn: x.date,
      type: 'payout',
      label: 'Commission Paid',
      delta: -x.amount
    }))].sort((a, b) => a.date === b.date ? 0 : a.date > b.date ? 1 : -1);
    let running = 0;
    const rows = entries.map(e => {
      running += e.delta;
      return {
        ...e,
        balanceAfter: running
      };
    });
    const finalBalance = running;
    const weekOrder = [];
    const weekMap = {};
    rows.forEach(r => {
      const w = weekInfo(r.date);
      if (!weekMap[w.key]) {
        weekMap[w.key] = {
          label: w.label,
          rows: [],
          salesTotal: 0,
          paidTotal: 0
        };
        weekOrder.push(w.key);
      }
      weekMap[w.key].rows.push(r);
      if (r.type === 'sales') weekMap[w.key].salesTotal += r.salesAmt;else weekMap[w.key].paidTotal += Math.abs(r.delta);
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 16px',
        maxWidth: 480,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowLedger(null),
      className: "no-print",
      style: {
        background: '#F1F5F9',
        border: 'none',
        borderRadius: 10,
        padding: '8px 14px',
        fontWeight: 600,
        color: '#475569',
        cursor: 'pointer',
        fontSize: 13,
        marginBottom: 20
      }
    }, "← Back"), /*#__PURE__*/React.createElement("div", {
      className: "card-shadow-lg",
      style: {
        background: '#fff',
        borderRadius: 24,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "slip-header",
      style: {
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(99,102,241,0.15)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#6366F1',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 4
      }
    }, "Commission Ledger — Weekly"), /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 800,
        marginBottom: 2
      }
    }, settings.shopName), /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#94A3B8',
        fontSize: 13
      }
    }, s.name, " · ", rate, "% commission rate")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px'
      }
    }, rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 13,
        padding: '24px 0'
      }
    }, "No commission activity recorded yet for ", s.name, ".") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        marginBottom: 16
      }
    }, weekOrder.map(wk => {
      const week = weekMap[wk];
      const weekEndBalance = week.rows[week.rows.length - 1].balanceAfter;
      return /*#__PURE__*/React.createElement("div", {
        key: wk,
        style: {
          border: '1.5px solid #F1F5F9',
          borderRadius: 14,
          overflow: 'hidden'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          background: '#FDF2F8',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 800,
          color: '#BE185D',
          fontSize: 12
        }
      }, "📅 Week: ", week.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 11,
          color: '#9D174D',
          fontWeight: 600
        }
      }, "Bal: ", fmt(weekEndBalance))), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '4px 14px'
        }
      }, week.rows.map((r, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '10px 0',
          borderBottom: i < week.rows.length - 1 ? '1px solid #F8FAFC' : 'none'
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          color: '#1E1B4B',
          fontSize: 12.5
        }
      }, r.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5,
          color: '#94A3B8',
          marginTop: 2
        }
      }, r.date, r.type === 'sales' ? ` · Sales: ${fmt(r.salesAmt)}` : '', r.importedOn && r.importedOn !== r.date ? ` · Imported ${r.importedOn}` : '')), /*#__PURE__*/React.createElement("div", {
        style: {
          textAlign: 'right',
          flexShrink: 0,
          marginLeft: 12
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontWeight: 700,
          fontSize: 12.5,
          color: r.delta >= 0 ? '#15803D' : '#F43F5E'
        }
      }, r.delta >= 0 ? '+' : '', fmt(r.delta)), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 9.5,
          color: '#94A3B8',
          marginTop: 2
        }
      }, "Bal: ", fmt(r.balanceAfter)))))), /*#__PURE__*/React.createElement("div", {
        style: {
          background: '#FAFAFC',
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10.5,
          color: '#6B7280',
          fontWeight: 600
        }
      }, /*#__PURE__*/React.createElement("span", null, "Sales this week: ", fmt(week.salesTotal)), /*#__PURE__*/React.createElement("span", null, "Paid this week: ", fmt(week.paidTotal))));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        background: finalBalance > 0 ? '#FDF2F8' : finalBalance < 0 ? '#FFEDD5' : '#DCFCE7',
        borderRadius: 14,
        padding: '16px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 4
      }
    }, "Balance as of ", today.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })), /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: finalBalance > 0 ? '#BE185D' : finalBalance < 0 ? '#C2410C' : '#15803D'
      }
    }, finalBalance > 0 ? `${fmt(finalBalance)} Due` : finalBalance < 0 ? `${fmt(Math.abs(finalBalance))} Advance Given` : '✓ Fully Settled'), finalBalance === 0 && rows.length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#15803D',
        marginTop: 6
      }
    }, "Cleared as of ", rows[rows.length - 1].date)))), (() => {
      const lines = [];
      lines.push(`*${settings.shopName} — Commission Ledger*`);
      lines.push(`${s.name} · ${rate}% commission rate`);
      lines.push('');
      weekOrder.forEach(wk => {
        const week = weekMap[wk];
        const weekEndBalance = week.rows[week.rows.length - 1].balanceAfter;
        lines.push(`📅 Week: ${week.label}`);
        lines.push(`Sales: ${fmt(week.salesTotal)} · Paid: ${fmt(week.paidTotal)} · Bal: ${fmt(weekEndBalance)}`);
        lines.push('');
      });
      lines.push(`*Balance as of ${today.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })}: ${finalBalance > 0 ? `${fmt(finalBalance)} Due` : finalBalance < 0 ? `${fmt(Math.abs(finalBalance))} Advance Given` : 'Fully Settled ✓'}*`);
      const message = encodeURIComponent(lines.join('\n'));
      const phoneDigits = (s.phone || '').replace(/\D/g, '');
      const waNumber = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
      const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${message}` : `https://wa.me/?text=${message}`;
      return /*#__PURE__*/React.createElement("button", {
        onClick: () => window.open(waUrl, '_blank'),
        className: "no-print",
        style: {
          width: '100%',
          marginTop: 10,
          border: 'none',
          background: '#25D366',
          color: '#fff',
          fontWeight: 800,
          padding: '13px',
          borderRadius: 14,
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'DM Sans,sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }
      }, "💬 Send Summary on WhatsApp", !s.phone && ' (no number saved — pick contact)');
    })(), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.print(),
      className: "no-print",
      style: {
        width: '100%',
        marginTop: 10,
        border: '1.5px solid #E2E8F0',
        background: '#fff',
        color: '#475569',
        fontWeight: 700,
        padding: '13px',
        borderRadius: 14,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'DM Sans,sans-serif'
      }
    }, "🖨️ Print / Save as PDF — Show to Staff"));
  }

  /* Salary Slip View */
  if (showSlip) {
    const s = staff.find(st => st.id === showSlip);
    const p = mPay[showSlip];
    if (!s || !p) {
      setShowSlip(null);
      return null;
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 16px',
        maxWidth: 480,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowSlip(null),
      className: "no-print",
      style: {
        background: '#F1F5F9',
        border: 'none',
        borderRadius: 10,
        padding: '8px 14px',
        fontWeight: 600,
        color: '#475569',
        cursor: 'pointer',
        fontSize: 13,
        marginBottom: 20
      }
    }, "← Back"), /*#__PURE__*/React.createElement("div", {
      className: "card-shadow-lg",
      style: {
        background: '#fff',
        borderRadius: 24,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "slip-header",
      style: {
        padding: '24px 20px',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(99,102,241,0.15)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(139,92,246,0.1)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        color: '#6366F1',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 4
      }
    }, "Salary Slip"), /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 800,
        marginBottom: 2
      }
    }, settings.shopName), /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#94A3B8',
        fontSize: 13
      }
    }, mName(selMonth)), /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#A78BFA',
        fontSize: 11,
        marginTop: 2
      }
    }, "Salary Cycle: ", cycleLabel(s.payoutDay || 1, selMonth))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        paddingBottom: 20,
        borderBottom: '1px solid #F1F5F9'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: s.name,
      size: 48
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        fontWeight: 800,
        color: '#1E1B4B',
        fontSize: 18
      }
    }, s.name), s.phone && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2
      }
    }, "📞 ", s.phone), s.bankName && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2
      }
    }, "🏦 ", s.bankName, s.accountNumber ? ` · ****${s.accountNumber.slice(-4)}` : ''))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2,1fr)',
        gap: 10,
        marginBottom: 20
      }
    }, [['Days Present', p.present, '#059669', '#DCFCE7'], ['Days Absent', p.absent, '#BE123C', '#FFE4E8'], ['Half Days', p.half, '#B45309', '#FEF3C7'], ['Late Days', p.late, '#C2410C', '#FFEDD5']].map(([l, v, c, bg]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        background: bg,
        borderRadius: 12,
        padding: '12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        fontSize: 28,
        fontWeight: 800,
        color: c,
        lineHeight: 1
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: c,
        fontWeight: 600,
        opacity: 0.8,
        marginTop: 2
      }
    }, l)))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#F8FAFF',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 16
      }
    }, [['Monthly Salary', fmt(s.monthlySalary)], ['Daily Rate (÷26)', `${fmt(dailyRate(s))}/day`], ['Gross Salary', fmt(p.gross)]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 10,
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#6B7280',
        fontWeight: 500
      }
    }, l), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: '#1E1B4B'
      }
    }, v))), p.lateFine > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 10,
        fontSize: 13,
        color: '#BE123C'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, "Late Fine (", p.late, " days)"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "− ", fmt(p.lateFine))), p.advanceDeduction > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 10,
        fontSize: 13,
        color: '#C2410C'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, "Advance Taken"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700
      }
    }, "− ", fmt(p.advanceDeduction))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: '#E2E8F0',
        margin: '12px 0'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 700,
        color: '#1E1B4B',
        fontSize: 14
      }
    }, "Net Salary"), /*#__PURE__*/React.createElement("span", {
      className: "font-display",
      style: {
        fontWeight: 800,
        color: '#4F46E5',
        fontSize: 24
      }
    }, fmt(p.netSalary)))), p.approved ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#DCFCE7',
        border: '1.5px solid #86EFAC',
        borderRadius: 12,
        padding: '12px',
        textAlign: 'center',
        color: '#15803D',
        fontWeight: 700,
        fontSize: 14,
        marginBottom: 10
      }
    }, "✓ Approved for Payment"), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleUnapprove(showSlip),
      className: "no-print",
      style: {
        width: '100%',
        border: '1.5px solid #E2E8F0',
        background: '#fff',
        color: '#64748B',
        fontWeight: 700,
        fontSize: 13,
        padding: '11px',
        borderRadius: 12,
        cursor: 'pointer'
      }
    }, "Undo — Mark as Unpaid")) : /*#__PURE__*/React.createElement("button", {
      onClick: () => handleApprove(showSlip),
      className: "btn-success",
      style: {
        width: '100%',
        border: 'none',
        color: '#fff',
        fontWeight: 800,
        fontSize: 15,
        padding: '14px',
        borderRadius: 14,
        cursor: 'pointer',
        fontFamily: 'DM Sans,sans-serif'
      }
    }, "Approve & Pay ", fmt(p.netSalary)))), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.print(),
      className: "no-print",
      style: {
        width: '100%',
        marginTop: 14,
        border: '1.5px solid #E2E8F0',
        background: '#fff',
        color: '#475569',
        fontWeight: 700,
        padding: '13px',
        borderRadius: 14,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'DM Sans,sans-serif'
      }
    }, "🖨️ Print / Save as PDF"));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 16px',
      maxWidth: 480,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 22,
      marginBottom: 16
    }
  }, "Payroll"), /*#__PURE__*/React.createElement("select", {
    value: selMonth,
    onChange: e => setSelMonth(e.target.value),
    className: "input-field",
    style: {
      marginBottom: 16,
      fontWeight: 600
    }
  }, months.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, mName(m)))), /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '16px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: staff.length ? 12 : 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 15
    }
  }, "💵 Advances / Mid-month Withdrawals"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 2
    }
  }, "Auto-deducted from final salary")), staff.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => openAdvForm(),
    className: "btn-primary",
    style: {
      border: 'none',
      color: '#fff',
      fontWeight: 700,
      padding: '8px 14px',
      borderRadius: 10,
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'DM Sans,sans-serif',
      flexShrink: 0
    }
  }, Ic.plus, " Add")), staff.filter(s => (mAdv[s.id] || []).length > 0).length === 0 ? staff.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#94A3B8',
      textAlign: 'center',
      padding: '8px 0'
    }
  }, "No advances given this month") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, staff.filter(s => (mAdv[s.id] || []).length > 0).map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      background: '#FFF7ED',
      borderRadius: 12,
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: '#1E1B4B',
      fontSize: 13
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 800,
      color: '#C2410C',
      fontSize: 13
    }
  }, "− ", fmt(totalAdvance(s.id)))), (mAdv[s.id] || []).map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 11,
      color: '#92400E',
      padding: '3px 0'
    }
  }, /*#__PURE__*/React.createElement("span", null, a.date, a.note ? ` · ${a.note}` : ''), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, fmt(a.amount), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDelAdvance(s.id, a.id),
    style: {
      background: 'none',
      border: 'none',
      color: '#F43F5E',
      cursor: 'pointer',
      padding: 0,
      display: 'flex'
    }
  }, Ic.trash)))))))), showAdvForm && /*#__PURE__*/React.createElement("div", {
    onClick: () => setShowAdvForm(false),
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,10,46,0.5)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    className: "card-shadow-lg",
    style: {
      background: '#fff',
      borderRadius: '24px 24px 0 0',
      padding: '20px',
      width: '100%',
      maxWidth: 480
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 17,
      marginBottom: 16
    }
  }, "Give Advance / Withdrawal"), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Staff Member *"), /*#__PURE__*/React.createElement("select", {
    value: advForm.staffId,
    onChange: e => setAdvForm(p => ({
      ...p,
      staffId: e.target.value
    })),
    className: "input-field",
    style: {
      marginBottom: 14,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select staff"), staff.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name))), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Amount (₹) *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: advForm.amount,
    onChange: e => setAdvForm(p => ({
      ...p,
      amount: e.target.value
    })),
    placeholder: "e.g. 2000",
    className: "input-field",
    style: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Date"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: advForm.date,
    onChange: e => setAdvForm(p => ({
      ...p,
      date: e.target.value
    })),
    max: dKey(today),
    className: "input-field",
    style: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Note (optional)"), /*#__PURE__*/React.createElement("input", {
    value: advForm.note,
    onChange: e => setAdvForm(p => ({
      ...p,
      note: e.target.value
    })),
    placeholder: "e.g. Diwali advance",
    className: "input-field",
    style: {
      marginBottom: 18
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAdvForm(false),
    style: {
      flex: 1,
      border: '1.5px solid #E2E8F0',
      background: '#fff',
      color: '#64748B',
      borderRadius: 12,
      padding: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 14
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleAddAdvance,
    className: "btn-primary",
    style: {
      flex: 2,
      border: 'none',
      color: '#fff',
      borderRadius: 12,
      padding: '13px',
      fontWeight: 800,
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Save Advance")))), commStaff.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '16px',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 15
    }
  }, "🎯 Commission on Sales"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 2
    }
  }, "Pay anytime — not tied to salary date")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => openSalesForm(),
    className: "btn-primary",
    style: {
      border: 'none',
      color: '#fff',
      fontWeight: 700,
      padding: '8px 12px',
      borderRadius: 10,
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, Ic.plus, " Sales"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmClearCommission(true),
    style: {
      border: '1.5px solid #FBCFE8',
      background: '#fff',
      color: '#BE185D',
      fontWeight: 700,
      padding: '8px 10px',
      borderRadius: 10,
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center'
    }
  }, Ic.trash))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      border: '1.5px dashed #C7D2FE',
      borderRadius: 12,
      padding: '10px',
      cursor: 'pointer',
      background: '#F8FAFF',
      marginBottom: 6,
      fontSize: 12,
      fontWeight: 700,
      color: '#6366F1'
    }
  }, Ic.up, " Import Sales CSV from Power BI", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".csv,.txt",
    onChange: handleSalesCSV,
    style: {
      display: 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: '#94A3B8',
      textAlign: 'center',
      marginBottom: 10
    }
  }, "Works directly with Power BI's raw \"Export data\" file — no need to total it in Excel first"), /*#__PURE__*/React.createElement("button", {
    onClick: dlSalesSample,
    style: {
      background: 'none',
      border: 'none',
      color: '#94A3B8',
      fontWeight: 600,
      fontSize: 11,
      cursor: 'pointer',
      display: 'block',
      margin: '0 auto 14px',
      padding: 0
    }
  }, "Or download simple manual-entry format"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, commStaff.map(s => {
    const earned = commissionEarned(s),
      paid = totalPaidOut(s.id),
      due = balanceDue(s);
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      style: {
        background: '#FDF2F8',
        borderRadius: 14,
        padding: '12px 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: '#1E1B4B',
        fontSize: 13
      }
    }, s.name, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#BE185D',
        fontWeight: 600,
        fontSize: 11
      }
    }, "(", s.commissionRate, "%)")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 800,
        color: due > 0 ? '#BE185D' : due < 0 ? '#C2410C' : '#15803D',
        fontSize: 14
      }
    }, due > 0 ? `${fmt(due)} due` : due < 0 ? `${fmt(Math.abs(due))} advance` : '✓ Settled')), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#9D174D',
        marginBottom: 8
      }
    }, "Sales: ", fmt(totalSales(s.id)), " · Earned: ", fmt(earned), " · Paid: ", fmt(paid)), due < 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: '#C2410C',
        background: '#FFEDD5',
        borderRadius: 8,
        padding: '6px 10px',
        marginBottom: 8
      }
    }, "Paid ", fmt(Math.abs(due)), " more than earned so far — will auto-adjust as new sales are added."), cSales(s.id).length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, cSales(s.id).map(entry => /*#__PURE__*/React.createElement("div", {
      key: entry.id,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 10.5,
        color: '#9D174D',
        padding: '2px 0'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Sales: ", fmtSalesRange(entry), entry.note && !entry.dateFrom ? ` · ${entry.note}` : ''), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, fmt(entry.amount), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDelSales(s.id, entry.id),
      style: {
        background: 'none',
        border: 'none',
        color: '#F43F5E',
        cursor: 'pointer',
        padding: 0,
        display: 'flex'
      }
    }, Ic.trash))))), cPayouts(s.id).length > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8,
        borderTop: '1px dashed #FBCFE8',
        paddingTop: 6
      }
    }, cPayouts(s.id).map(p => /*#__PURE__*/React.createElement("div", {
      key: p.id,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10.5,
        color: '#059669',
        padding: '2px 0'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Paid on ", p.date), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, fmt(p.amount), /*#__PURE__*/React.createElement("button", {
      onClick: () => handleDelPayout(s.id, p.id),
      style: {
        background: 'none',
        border: 'none',
        color: '#F43F5E',
        cursor: 'pointer',
        padding: 0,
        display: 'flex'
      }
    }, Ic.trash))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowLedger(s.id),
      style: {
        flex: 1,
        border: '1.5px solid #FBCFE8',
        background: '#fff',
        color: '#BE185D',
        borderRadius: 10,
        padding: '9px',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer'
      }
    }, "📒 View Ledger"), /*#__PURE__*/React.createElement("button", {
      onClick: () => openPayoutForm(s.id),
      className: "btn-success",
      style: {
        flex: 1,
        border: 'none',
        color: '#fff',
        borderRadius: 10,
        padding: '9px',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: 'DM Sans,sans-serif'
      }
    }, due > 0 ? 'Pay Commission Now' : 'Give Advance / Extra Payment')));
  }))), showSalesForm && /*#__PURE__*/React.createElement("div", {
    onClick: () => setShowSalesForm(false),
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,10,46,0.5)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    className: "card-shadow-lg",
    style: {
      background: '#fff',
      borderRadius: '24px 24px 0 0',
      padding: '20px',
      width: '100%',
      maxWidth: 480
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 17,
      marginBottom: 16
    }
  }, "Add Sales for Commission"), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Staff Member *"), /*#__PURE__*/React.createElement("select", {
    value: salesForm.staffId,
    onChange: e => setSalesForm(p => ({
      ...p,
      staffId: e.target.value
    })),
    className: "input-field",
    style: {
      marginBottom: 14,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select staff"), commStaff.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name, " (", s.commissionRate, "%)"))), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Sales Amount (₹) *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: salesForm.amount,
    onChange: e => setSalesForm(p => ({
      ...p,
      amount: e.target.value
    })),
    placeholder: "e.g. 50000",
    className: "input-field",
    style: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Period"), /*#__PURE__*/React.createElement("input", {
    value: salesForm.period,
    onChange: e => setSalesForm(p => ({
      ...p,
      period: e.target.value
    })),
    placeholder: "e.g. July 2026",
    className: "input-field",
    style: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Note (optional)"), /*#__PURE__*/React.createElement("input", {
    value: salesForm.note,
    onChange: e => setSalesForm(p => ({
      ...p,
      note: e.target.value
    })),
    placeholder: "e.g. From Power BI Salesman Report",
    className: "input-field",
    style: {
      marginBottom: 18
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSalesForm(false),
    style: {
      flex: 1,
      border: '1.5px solid #E2E8F0',
      background: '#fff',
      color: '#64748B',
      borderRadius: 12,
      padding: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 14
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleAddSales,
    className: "btn-primary",
    style: {
      flex: 2,
      border: 'none',
      color: '#fff',
      borderRadius: 12,
      padding: '13px',
      fontWeight: 800,
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Save Sales")))), confirmClearCommission && /*#__PURE__*/React.createElement("div", {
    onClick: () => setConfirmClearCommission(false),
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,10,46,0.5)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    className: "card-shadow-lg",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '24px',
      width: '100%',
      maxWidth: 360,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      marginBottom: 10
    }
  }, "⚠️"), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 16,
      marginBottom: 6
    }
  }, "Clear All Commission Data?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: '#6B7280',
      marginBottom: 20
    }
  }, "This removes every sales entry and payout for all staff — a fresh start for re-importing. Salary, attendance, and advances are NOT affected."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setConfirmClearCommission(false),
    style: {
      flex: 1,
      border: '1.5px solid #E2E8F0',
      background: '#fff',
      color: '#64748B',
      borderRadius: 12,
      padding: '12px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 14
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handleClearCommission,
    style: {
      flex: 1,
      border: 'none',
      background: '#F43F5E',
      color: '#fff',
      borderRadius: 12,
      padding: '12px',
      fontWeight: 800,
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Clear All")))), showPayoutForm && /*#__PURE__*/React.createElement("div", {
    onClick: () => setShowPayoutForm(null),
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,10,46,0.5)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    className: "card-shadow-lg",
    style: {
      background: '#fff',
      borderRadius: '24px 24px 0 0',
      padding: '20px',
      width: '100%',
      maxWidth: 480
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 17,
      marginBottom: 6
    }
  }, "Pay Commission"), (() => {
    const s = staff.find(x => x.id === showPayoutForm);
    const due = s ? balanceDue(s) : 0;
    const label = due > 0 ? `Balance due: ${fmt(due)}` : due < 0 ? `Already ${fmt(Math.abs(due))} in advance` : 'Fully settled — this will count as an advance';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 16
      }
    }, s?.name, " · ", label);
  })(), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Amount to Pay (₹) *"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: payoutAmount,
    onChange: e => setPayoutAmount(e.target.value),
    placeholder: "e.g. 2000 (works for advance, partial, or full)",
    className: "input-field",
    style: {
      marginBottom: 18
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowPayoutForm(null),
    style: {
      flex: 1,
      border: '1.5px solid #E2E8F0',
      background: '#fff',
      color: '#64748B',
      borderRadius: 12,
      padding: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 14
    }
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: handlePayout,
    className: "btn-success",
    style: {
      flex: 2,
      border: 'none',
      color: '#fff',
      borderRadius: 12,
      padding: '13px',
      fontWeight: 800,
      cursor: 'pointer',
      fontSize: 14,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Confirm Payment")))), !calc ? /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 24,
      padding: '48px 24px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 52,
      marginBottom: 16
    }
  }, "💰"), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 20,
      marginBottom: 8
    }
  }, "Calculate Salaries"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#94A3B8',
      fontSize: 13,
      marginBottom: 24,
      lineHeight: 1.6
    }
  }, "Each staff member's salary will be calculated using their own salary-date cycle, not the calendar month"), staff.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FEF3C7',
      border: '1px solid #FDE68A',
      borderRadius: 12,
      padding: '12px',
      color: '#92400E',
      fontSize: 13,
      fontWeight: 600
    }
  }, "⚠ Add staff members first") : /*#__PURE__*/React.createElement("button", {
    onClick: handleCalc,
    className: "btn-primary",
    style: {
      border: 'none',
      color: '#fff',
      fontWeight: 800,
      padding: '14px 40px',
      borderRadius: 14,
      cursor: 'pointer',
      fontSize: 15,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "Calculate Salaries")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-card card-shadow-lg",
    style: {
      borderRadius: 20,
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -20,
      right: -20,
      width: 100,
      height: 100,
      borderRadius: '50%',
      background: 'rgba(99,102,241,0.1)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6366F1',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 4
    }
  }, "Total Payable · ", mName(selMonth)), /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontSize: 34,
      fontWeight: 800,
      color: '#fff',
      marginBottom: 8
    }
  }, fmt(totalPayable)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#10B981'
    }
  }, staff.filter(s => (mPay[s.id] || {}).approved).length), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: 500,
      marginLeft: 4
    }
  }, "approved")), pendingCount > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      color: '#FBBF24'
    }
  }, pendingCount), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: 500,
      marginLeft: 4
    }
  }, "pending")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCalc,
    style: {
      flex: 1,
      border: '1.5px solid #E2E8F0',
      background: '#fff',
      color: '#64748B',
      borderRadius: 12,
      padding: '11px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 12
    }
  }, "🔄 Recalculate"), !allApproved && /*#__PURE__*/React.createElement("button", {
    onClick: handleApproveAll,
    className: "btn-success",
    style: {
      flex: 1,
      border: 'none',
      color: '#fff',
      borderRadius: 12,
      padding: '11px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 12,
      fontFamily: 'DM Sans,sans-serif'
    }
  }, "✅ Approve All"), anyApproved && /*#__PURE__*/React.createElement("button", {
    onClick: exportCSV,
    style: {
      flex: 1,
      border: 'none',
      background: '#1E1B4B',
      color: '#fff',
      borderRadius: 12,
      padding: '11px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6
    }
  }, Ic.dl, " Export")), anyApproved && /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#EFF6FF',
      border: '1px solid #BFDBFE',
      borderRadius: 14,
      padding: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      color: '#1D4ED8',
      fontSize: 12,
      marginBottom: 4
    }
  }, "💳 How to pay via your bank"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#1E40AF',
      lineHeight: 1.6
    }
  }, "Export the CSV above → Open your bank's net banking → Go to \"Bulk Transfer\" or \"Multiple NEFT\" → Upload the file → Enter OTP → Done. Works with SBI, HDFC, ICICI, Axis & most Indian banks.")), staff.map(s => {
    const p = mPay[s.id] || {};
    return /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: "card-shadow",
      style: {
        background: '#fff',
        borderRadius: 20,
        padding: '16px',
        border: p.approved ? '1.5px solid #86EFAC' : '1.5px solid #F1F5F9',
        transition: 'border-color 0.2s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: s.name,
      size: 42
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 700,
        color: '#1E1B4B',
        fontSize: 15
      }
    }, s.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: 500
      }
    }, fmt(s.monthlySalary), "/mo · ", fmt(dailyRate(s)), "/day"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: '#6366F1',
        fontWeight: 600,
        marginTop: 2
      }
    }, "📅 Cycle: ", cycleLabel(s.payoutDay || 1, selMonth))), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        fontSize: 20,
        fontWeight: 800,
        color: '#4F46E5'
      }
    }, fmt(p.netSalary || 0)), p.advanceDeduction > 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: '#C2410C',
        fontWeight: 600
      }
    }, "− ", fmt(p.advanceDeduction), " advance"), p.approved && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: 700
      }
    }, "✓ Approved"))), p.calculated && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8,
        marginBottom: 14
      }
    }, [['P', p.present, '#059669', '#DCFCE7'], ['A', p.absent, '#BE123C', '#FFE4E8'], ['H', p.half, '#B45309', '#FEF3C7'], ['L', p.late, '#C2410C', '#FFEDD5']].map(([l, v, c, bg]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        background: bg,
        borderRadius: 10,
        padding: '8px 4px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-display",
      style: {
        fontWeight: 800,
        fontSize: 18,
        color: c
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9.5,
        color: c,
        fontWeight: 600,
        opacity: 0.8
      }
    }, l === 'P' ? 'Present' : l === 'A' ? 'Absent' : l === 'H' ? 'Half' : 'Late')))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowSlip(s.id),
      style: {
        flex: 1,
        border: '1.5px solid #E2E8F0',
        background: '#F8FAFF',
        color: '#475569',
        borderRadius: 12,
        padding: '10px',
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: 13
      }
    }, "View Slip"), !p.approved ? /*#__PURE__*/React.createElement("button", {
      onClick: () => handleApprove(s.id),
      className: "btn-success",
      style: {
        flex: 1,
        border: 'none',
        color: '#fff',
        borderRadius: 12,
        padding: '10px',
        fontWeight: 700,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'DM Sans,sans-serif'
      }
    }, "Approve & Pay") : /*#__PURE__*/React.createElement("button", {
      onClick: () => handleUnapprove(s.id),
      style: {
        flex: 1,
        background: '#DCFCE7',
        color: '#15803D',
        border: 'none',
        borderRadius: 12,
        padding: '10px',
        fontWeight: 700,
        fontSize: 13,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer'
      }
    }, Ic.chk, " Paid · Tap to Undo")));
  })));
}

/* ── Settings Page ── */
function SettingsPage({
  settings,
  saveSettings
}) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const handleSave = async () => {
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 16px',
      maxWidth: 480,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-display",
    style: {
      fontWeight: 800,
      color: '#1E1B4B',
      fontSize: 22,
      marginBottom: 20
    }
  }, "Settings"), /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '20px',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "🏪 Shop Details"), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Shop Name"), /*#__PURE__*/React.createElement("input", {
    value: form.shopName,
    onChange: e => setForm(p => ({
      ...p,
      shopName: e.target.value
    })),
    className: "input-field",
    placeholder: "Enter your shop name"
  })), /*#__PURE__*/React.createElement("div", {
    className: "card-shadow",
    style: {
      background: '#fff',
      borderRadius: 20,
      padding: '20px',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "💰 Salary Rules"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 10
    }
  }, "Half Day Pay Rate"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, [[0.5, '50%'], [0.6, '60%'], [0.75, '75%'], [1.0, 'Full']].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setForm(p => ({
      ...p,
      halfDayRate: v
    })),
    style: {
      flex: 1,
      border: `2px solid ${form.halfDayRate === v ? '#6366F1' : '#E2E8F0'}`,
      background: form.halfDayRate === v ? '#EEF2FF' : '#F8FAFF',
      color: form.halfDayRate === v ? '#4F46E5' : '#94A3B8',
      borderRadius: 12,
      padding: '10px 4px',
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 13,
      transition: 'all 0.15s',
      fontFamily: 'DM Sans,sans-serif'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 8,
      fontWeight: 500
    }
  }, "Staff gets this percentage of daily wage for a half day")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      display: 'block',
      marginBottom: 6
    }
  }, "Late Fine per Late Day (₹)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: form.lateFine,
    onChange: e => setForm(p => ({
      ...p,
      lateFine: Number(e.target.value)
    })),
    placeholder: "0 = no fine",
    className: "input-field"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 6,
      fontWeight: 500
    }
  }, "Deducted from salary for each day marked as Late"))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSave,
    style: {
      width: '100%',
      border: 'none',
      fontWeight: 800,
      fontSize: 15,
      padding: '15px',
      borderRadius: 14,
      cursor: 'pointer',
      fontFamily: 'DM Sans,sans-serif',
      background: saved ? 'linear-gradient(135deg,#059669,#10B981)' : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
      color: '#fff',
      transition: 'background 0.3s'
    }
  }, saved ? '✅ Settings Saved!' : 'Save Settings'), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFF',
      border: '1px solid #E2E8F0',
      borderRadius: 16,
      padding: '16px',
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 1.8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      marginBottom: 6
    }
  }, "☁️"), "Data syncs to your private cloud database.", /*#__PURE__*/React.createElement("br", null), "Only your app can access it — never shared or sold.")));
}
const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(/*#__PURE__*/React.createElement(App, null));
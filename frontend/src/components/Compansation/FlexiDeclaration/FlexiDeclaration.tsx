import { useState } from "react";

const earningsData = [
  { label: "Basic", monthly: 562500, annually: 6749998 },
  { label: "HRA", monthly: 112500, annually: 1350000 },
  { label: "Provident Fund", monthly: 67500, annually: 810000 },
  { label: "Car Lease Rental", monthly: 102715, annually: 1232580 },
  { label: "Driver Salary", monthly: 25000, annually: 300000 },
  { label: "Car Repair and Maintenance Reimbursement", monthly: 4167, annually: 50000 },
  { label: "Special Allowance", monthly: 132600, annually: 1591218, info: true },
  { label: "Asset Reimbursement", monthly: 16667, annually: 200000 },
  { label: "Professional Development Course", monthly: 16667, annually: 200000 },
  { label: "Meal Card", monthly: 9600, annually: 115200 },
  { label: "Attire wallet", monthly: 1500, annually: 18000 },
  { label: "Telecom wallet", monthly: 12000, annually: 144000 },
  { label: "Reimbursement of Fuel Expense", monthly: 16667, annually: 200000 },
  { label: "Fitness & Wellbeing Reimbursement", monthly: 12000, annually: 144000 },
  { label: "Gift wallet", monthly: 1250, annually: 15000 },
];

const flexiComponents = [
  { label: "Car Lease Rental", range: "0 - 60,00,000", value: "1232580" },
  { label: "Driver Salary", range: "0 - 3,00,000", value: "300000" },
  { label: "Car Repair And Maintenance Reimbursement", range: "0 - 50,000", value: "50000" },
  { label: "NPS", range: "0 - 9,45,000", isNPS: true },
  { label: "Asset Reimbursement", range: "0 - 2,00,000", value: "200000" },
  { label: "Professional Development Course", range: "0 - 2,00,000", value: "200000" },
  { label: "Meal Card", range: "0 - 1,35,200", value: "115200" },
  { label: "Attire Wallet", range: "0 - 18,000", value: "18000" },
  { label: "Telecom Wallet", range: "0 - 1,44,000", value: "144000" },
];



function formatINR(num) {
  if (!num && num !== 0) return "";
  return Number(num).toLocaleString("en-IN");
}

export default function FlexiDeclaration() {
  const [activeTab, setActiveTab] = useState("Flexi Components");
  const [showValues, setShowValues] = useState(true);
  const [npsType, setNpsType] = useState("amount");
  const [npsAmount, setNpsAmount] = useState("");
  const [flexi, setFlexi] = useState(
    flexiComponents.reduce((acc, c) => {
      acc[c.label] = c.value || "";
      return acc;
    }, {})
  );

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f4f6fb", minHeight: "100vh", color: "#1a1d23" }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e3e7ef", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <span style={{ fontWeight: 700, fontSize: 17, color: "#1a1d23", letterSpacing: "-0.3px" }}>Compensation</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 4l.5-1h11l.5 1" stroke="#9ca3af" strokeWidth="1.3"/><rect x="1" y="4" width="14" height="9" rx="1.5" stroke="#9ca3af" strokeWidth="1.3"/></svg>
            Financial Year
          </span>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1d23", background: "#f0f2f7", padding: "3px 10px", borderRadius: 6 }}>2026–27 ▾</span>
          <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 8 }}>Show Values</span>
          <div
            onClick={() => setShowValues(v => !v)}
            style={{
              width: 40, height: 22, borderRadius: 11, background: showValues ? "#2563eb" : "#d1d5db",
              position: "relative", cursor: "pointer", transition: "background 0.2s"
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: showValues ? 21 : 3,
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.18)", transition: "left 0.2s"
            }} />
          </div>
        </div>
      </div>


    
      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, maxWidth: 1400, margin: "0 auto", padding: "28px 28px 40px" }}>

        {/* LEFT: Flexi Declaration */}
        <div style={{ paddingRight: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1d23" }}>
              Flexi Declaration For FY 2026-27 (₹)
            </span>
            <span style={{
              background: "#fee2e2", color: "#dc2626", fontSize: 10, fontWeight: 700,
              padding: "2px 8px", borderRadius: 4, letterSpacing: "0.6px", textTransform: "uppercase"
            }}>CLOSED</span>
            <span style={{ color: "#9ca3af", cursor: "pointer", fontSize: 14 }}>✏️</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {flexiComponents.map((comp) =>
              comp.isNPS ? (
                <div key={comp.label}>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>
                    {comp.label} ({comp.range})
                  </label>
                  <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                      <input type="radio" name="nps" checked={npsType === "amount"} onChange={() => setNpsType("amount")} style={{ accentColor: "#2563eb" }} />
                      Amount
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                      <input type="radio" name="nps" checked={npsType === "percentage"} onChange={() => setNpsType("percentage")} style={{ accentColor: "#2563eb" }} />
                      Percentage
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Amount"
                    value={npsAmount}
                    onChange={e => setNpsAmount(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ) : (
                <div key={comp.label}>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>
                    {comp.label} ({comp.range})
                  </label>
                  <input
                    type="text"
                    value={flexi[comp.label]}
                    onChange={e => setFlexi(f => ({ ...f, [comp.label]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT: Annual & Monthly Fixed Gross */}
        <div style={{ paddingLeft: 4 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1d23" }}>
              Annual &amp; Monthly Fixed Gross (Annual)(Eg-100000)
            </span>
          </div>

          <div style={{
            background: "#fff", borderRadius: 10, border: "1px solid #e3e7ef",
            overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
          }}>
            {/* Table Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 130px 130px",
              background: "#f9fafb", borderBottom: "1px solid #e3e7ef",
              padding: "10px 16px"
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Earnings</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", textAlign: "right" }}>Monthly</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", textAlign: "right" }}>Annually</span>
            </div>

            {earningsData.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 130px 130px",
                  padding: "11px 16px",
                  background: i % 2 === 0 ? "#fff" : "#fafbfc",
                  borderBottom: i < earningsData.length - 1 ? "1px solid #f0f2f7" : "none",
                  alignItems: "center"
                }}
              >
                <span style={{ fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 5 }}>
                  {row.label}
                  {row.info && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 15, height: 15, borderRadius: "50%", background: "#e5e7eb",
                      fontSize: 10, color: "#6b7280", fontWeight: 700, cursor: "pointer"
                    }}>i</span>
                  )}
                </span>
                <span style={{ fontSize: 13, color: "#1a1d23", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {showValues ? formatINR(row.monthly) : "—"}
                </span>
                <span style={{ fontSize: 13, color: "#1a1d23", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {showValues ? formatINR(row.annually) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 7,
  padding: "10px 13px",
  fontSize: 14,
  color: "#1a1d23",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

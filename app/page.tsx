'use client';

import { useState, useEffect } from "react";

type Card = {
  id: number;
  name: string;
  temp: string;
  interest: string;
  email: string;
  count: number;
  sendCount: number;
  expoDate: string;
  lastContact: string;
};

type Interaction = {
  id: number;
  contactId: number;
  type: "mail" | "action" | "temp";
  value?: string; // temp のとき "Hot"/"Warm"/"Cold" を入れる
  date: string;
};

export default function Home() {

  const [cards, setCards] = useState([
    {
      id: 1,
      name: "田中真樹",
      temp: "Hot",
      interest: "OCR×建設業",
      email: "tanaka@example.com",
      count: 1,
      sendCount: 0,
      expoDate: "2026-01-01",     // 展示会日（固定）
      lastContact: "2026-01-10"   // 最終接触日（最初は展示会日）
    },
    {
      id: 2,
      name: "佐藤麻紀",
      temp: "Warm",
      interest: "DXサポート",
      email: "sato@example.com",
      count: 0,
      sendCount: 0,
      expoDate: "2026-02-10",
      lastContact: "2026-02-10"
    }
  ]);

  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
  } | null>(null);

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem("cards");
    if (saved) {
      setCards(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cards", JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    const saved = localStorage.getItem("interactions");
    if (saved) {
      setInteractions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("interactions", JSON.stringify(interactions));
  }, [interactions]);

  useEffect(() => {
    if (!importResult) return;

    const timer = setTimeout(() => {
      setImportResult(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [importResult]);


  const addAction = (contactId: number) => {
    setInteractions(prev => [
      ...prev,
      {
        id: Date.now(),
        contactId,
        type: "action",
        date: new Date().toISOString(),
      },
    ]);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean);

      const header = lines[0].split(",");

      const newCards = lines.slice(1).map((line, index) => {
        const values = line.split(",");

        const today = new Date().toISOString().split("T")[0];

        return {
          id: Date.now() + index,
          name: values[0],
          temp: values[1] || "Cold",
          interest: values[2] || "",
          email: values[3] || "",
          expoDate: values[4] || today,

          // 👇 追加
          count: 0,
          sendCount: 0,
          lastContact: values[4] || today
        };
      });

      setCards(prev => {
        const map = new Map(prev.map(card => [card.email, card]));

        let added = 0;
        let updated = 0;

        newCards.forEach(card => {
          const existing = map.get(card.email);

          if (existing) {
            updated++;
            map.set(card.email, { ...existing, ...card });
          } else {
            added++;
            map.set(card.email, card);
          }
        });

        setImportResult({ added, updated });

        return Array.from(map.values());
      });

    };

    reader.readAsText(file);
  };

  const undoLast = (contactId: number) => {
    setInteractions(prev => {
      const idx = [...prev].reverse().findIndex(i => i.contactId === contactId);
      if (idx === -1) return prev;
      const removeIndex = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== removeIndex);
    });
  };

  const deleteInteraction = (id: number) => {
    setInteractions(prev =>
      prev.filter(i => i.id !== id)
    );
  };

  const markAsSent = (contactId: number) => {
    const today = new Date().toISOString().split("T")[0];

    // 履歴追加
    setInteractions(prev => [
      ...prev,
      {
        id: Date.now(),
        contactId,
        type: "mail",
        date: new Date().toISOString(),
      },
    ]);

    // 旧ロジックも更新（UI壊さないため）
    setCards(prev =>
      prev.map(card =>
        card.id === contactId
          ? {
              ...card,
              count: card.count + 1,
              sendCount: card.sendCount + 1,
              lastContact: today,
            }
          : card
      )
    );
  };

  const getColor = (temp: string) => {
    if (temp === "Hot") return "red";
    if (temp === "Warm") return "orange";
    return "blue";
  };

  const cycleTemp = (contactId: number) => {
    const current = cards.find(c => c.id === contactId);
    if (!current) return;

    const next =
      current.temp === "Hot" ? "Warm" :
      current.temp === "Warm" ? "Cold" :
      "Hot";

    changeTemp(contactId, next);
  };

  const changeTemp = (contactId: number, newTemp: string) => {
    // ① いまの温度を cards から拾う（card はここでは使えないので cards.find）
    const current = cards.find(c => c.id === contactId);
    if (!current) return;

    // ② 同じ温度なら何もしない（ログも積まない）
    if (current.temp === newTemp) return;

    // ③ cards を更新
    setCards(prev =>
      prev.map(c => (c.id === contactId ? { ...c, temp: newTemp } : c))
    );

    // ④ 履歴に1回だけ保存
    setInteractions(prev => [
      ...prev,
      {
        id: Date.now(),
        contactId,
        type: "temp",
        value: newTemp,
        date: new Date().toISOString(),
      },
    ]);
  };

  const getDaysPassed = (lastContact: string) => {
    const today = new Date();
    const contact = new Date(lastContact);
    const diff = today.getTime() - contact.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getScore = (temp: string, count: number, lastContact: string) => {
    const tempScore =
      temp === "Hot" ? 3 :
      temp === "Warm" ? 2 : 1;

    const baseScore = tempScore * count;
    const days = getDaysPassed(lastContact);

    let decay = 0;
    if (days > 14) decay = 5;
    else if (days > 7) decay = 3;
    else if (days > 3) decay = 1;

    return Math.max(baseScore - decay, 0);
  };

  const getRiskLevel = (temp: string, count: number, lastContact: string) => {
    const days = getDaysPassed(lastContact);
    const score = getScore(temp, count, lastContact);

    if (days > 14 && count === 0) return "danger";
    if (days > 14 && score < 5) return "warning";
    return "normal";
  };

  const getCountFromHistory = (contactId: number) => {
    return interactions.filter(i => i.contactId === contactId).length;
  };

  const getLastContactFromHistory = (contactId: number) => {
    const list = interactions
      .filter(i => i.contactId === contactId)
      .sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

    return list[0]?.date || null;
  };

  const getActionCount = (contactId: number) => {
    return interactions.filter(i =>
      i.contactId === contactId &&
      (i.type === "mail" || i.type === "action")
    ).length;
  };

  const getSendCount = (contactId: number) => {
    return interactions.filter(i =>
      i.contactId === contactId &&
      i.type === "mail"
    ).length;
  };

  const getLastContact = (card: Card) => {
    const list = interactions
      .filter(i => i.contactId === card.id)
      .sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

    return list[0]?.date ?? card.expoDate;
  };

  const getSuggestedTemp = (card: Card) => {
    const last = getLastContact(card);
    const score = getScore(
      card.temp,
      getActionCount(card.id),
      last
    );

    // スコア高いのにCold/Warmなら上げ提案
    if (score >= 8 && card.temp !== "Hot") return "Hot";
    if (score >= 4 && card.temp === "Cold") return "Warm";

    return null;
  };

  const generateMail = (card: any) => {
    const risk = getRiskLevel(card.temp, card.count, card.lastContact);

  if (risk === "danger") {
    return `
  ${card.name}様

  展示会ではお時間いただきありがとうございました。
  その後フォローが出来ておらず失礼いたしました。

  改めて一度、情報交換のお時間をいただけますと幸いです。
      `;
    }

    if (risk === "warning") {
      return `
  ${card.name}様

  展示会後に一度ご連絡差し上げましたが、
  改めて貴社のご状況をお伺いできればと思いご連絡いたしました。
      `;
    }

    return `
  ${card.name}様

  その後のご状況いかがでしょうか。
  何かお力になれることがございましたらお知らせください。
    `;
  };

  const sortedCards = [...cards].sort((a, b) => {

    const lastA =
      getLastContactFromHistory(a.id) ?? a.lastContact;

    const lastB =
      getLastContactFromHistory(b.id) ?? b.lastContact;

    const countA = getCountFromHistory(a.id);
    const countB = getCountFromHistory(b.id);

    const riskPriority = (card: Card, last: string, count: number) => {
      const risk = getRiskLevel(card.temp, count, last);
      if (risk === "danger") return 3;
      if (risk === "warning") return 2;
      return 1;
    };

    const riskDiff =
      riskPriority(b, lastB, countB) -
      riskPriority(a, lastA, countA);

    if (riskDiff !== 0) return riskDiff;

    const scoreA = getScore(a.temp, countA, lastA);
    const scoreB = getScore(b.temp, countB, lastB);

    return scoreB - scoreA;
  });




    const dangerCount = sortedCards.filter(card =>
      getRiskLevel(card.temp, card.count, card.lastContact) === "danger"
    ).length;

    const warningCount = sortedCards.filter(card =>
      getRiskLevel(card.temp, card.count, card.lastContact) === "warning"
    ).length;


  useEffect(() => {
    const dangerCard = sortedCards.find(card =>
      getRiskLevel(card.temp, card.count, card.lastContact) === "danger"
    );

    if (dangerCard) {
      setSelectedId(dangerCard.id);
    }
  }, [cards]);
  
  return (
    <div style={{ padding: "20px" }}>
      <h1>展示会信頼構築システム</h1>

        {importResult && (
          <div
            style={{
              marginTop: "10px",
              padding: "8px",
              background: "#f6ffed",
              border: "1px solid #b7eb8f",
              borderRadius: "4px",
              fontSize: "13px"
            }}
          >
            取込完了：
            新規 {importResult.added}件 /
            更新 {importResult.updated}件
          </div>
        )}

          {/* 👇 ここに入れる */}
        <div style={{ marginBottom: "15px" }}>
          <input type="file" accept=".csv" onChange={handleCSVImport} />
        </div>
        <button
        onClick={() => {
          localStorage.removeItem("cards");
          localStorage.removeItem("interactions");
          window.location.reload();
        }}
        style={{
          marginTop: "10px",
          padding: "6px 10px",
          background: "gray",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        🔄 テストリセット
      </button>

      <div style={{
        marginTop: "10px",
        padding: "10px",
        background: "#f5f5f5",
        border: "1px solid #ddd",
        display: "flex",
        gap: "20px"
      }}>
        <div style={{ color: "red", fontWeight: "bold" }}>
          🔴 危険 {dangerCount}件
        </div>

        <div style={{ color: "orange", fontWeight: "bold" }}>
          🟠 要フォロー {warningCount}件
        </div>
      </div>

        {sortedCards.map(card => {

          const suggested = getSuggestedTemp(card);

          const last =
            getLastContactFromHistory(card.id) ?? card.lastContact;

          const risk = getRiskLevel(card.temp, card.count, card.lastContact);

          return (

            <div key={card.id} 
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginTop: "10px",
              borderLeft: `8px solid ${
                risk === "danger"
                ? "red"
                : risk === "warning"
                ? "orange"
                : getColor(card.temp)
              }`
          }}>

          <h3>{card.name}</h3>
            <p>
              温度：
              <select
                value={card.temp}
                onChange={(e) => changeTemp(card.id, e.target.value)}
                style={{ marginLeft: 8 }}
              >
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </p>

          {suggested && (
            <div
              style={{
                marginTop: "6px",
                padding: "6px 8px",
                background: "#f0fff4",
                border: "1px solid #b7eb8f",
                borderRadius: "4px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <span style={{ color: "green", fontWeight: "bold" }}>
                🔼 {suggested} に上げる提案があります
              </span>

              <button
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  border: "none",
                  background: "green",
                  color: "white",
                  cursor: "pointer"
                }}
                onClick={() =>
                  setCards(prev =>
                    prev.map(c =>
                      c.id === card.id
                        ? { ...c, temp: suggested }
                        : c
                    )
                  )
                }
              >
                反映する
              </button>
            </div>
          )}

          <p>興味分野：{card.interest}</p>
          <p>接触回数：{getCountFromHistory(card.id)}</p>
          <p>送信回数：{getSendCount(card.id)}</p>
          <p>経過日数：{getDaysPassed(last)}日</p>
          <p>信頼スコア：{getScore(card.temp, getActionCount(card.id), last)}</p>
            {risk === "danger" && (
              <p style={{ color: "red", fontWeight: "bold" }}>
                ⚠ 危険：未フォロー</p>
            )}

            {risk === "warning" && (
              <p style={{ color: "orange", fontWeight: "bold" }}>
                ⚠ 要フォロー</p>
            )}


        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "8px"
          }}
        >
            <button onClick={() => cycleTemp(card.id)}>温度変更</button>
            <button onClick={() => addAction(card.id)} style={{ marginLeft: "10px" }}>
              行動追加
            </button>
            <button
              onClick={() =>
                setSelectedId(selectedId === card.id ? null : card.id)
              }
              style={{ marginLeft: "10px" }}
            >
              📩 メール生成
            </button>
            <button
              onClick={() => {
                const mail = generateMail(card);
                window.open(
                  `https://mail.google.com/mail/?view=cm&fs=1&to=${card.email}&su=展示会のお礼&body=${encodeURIComponent(mail)}`
                );
              }}
              style={{ marginLeft: "10px" }}
            >
              📬 Gmailで開く
            </button>
             <button
              onClick={() => markAsSent(card.id)}
              style={{ marginLeft: "10px" }}
            >
              ✅ 送信済み
            </button>
            <button
              onClick={() => undoLast(card.id)}
              style={{ marginLeft: "10px", background: "#eee" }}
            >
              ↩︎ 直前を戻す
            </button>

          </div>

            {selectedId === card.id && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: "#f9f9f9",
                  border: "1px solid #ddd"
                }}
              >
                <textarea
                  value={generateMail(card)}
                  readOnly
                  style={{ width: "100%", height: "150px" }}
                />

                {/* 🔽 ここに入れる 🔽 */}

                <div style={{ marginTop: "10px", fontSize: "12px" }}>
                  <strong>履歴:</strong>

                  {interactions
                    .filter(i => i.contactId === card.id)
                    .map(i => (
                      <div key={i.id} style={{ display: "flex", gap: "8px" }}>
                        <span>
                          {i.type === "temp"
                            ? `温度変更 → ${i.value}`
                            : i.type
                          }
                          - {new Date(i.date).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => deleteInteraction(i.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "red",
                            cursor: "pointer"
                          }}
                        >
                          🗑
                        </button>
                        
                      </div>
                    ))}
                </div>

              </div>
            )}
        </div>
          );
        })}
    </div>
  );
}
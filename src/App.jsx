import { useState } from "react";

export default function App() {
  const [channel, setChannel] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [minViews, setMinViews] = useState("");

  // 🎥 FETCH YOUTUBE
  const fetchVideos = async (name) => {
    const key = import.meta.env.VITE_API_KEY;

    const search = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${name}&key=${key}`
    ).then(r => r.json());

    if (!search.items?.length) throw new Error("Channel not found");

    const channelId = search.items[0].snippet.channelId;

    const channelData = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${key}`
    ).then(r => r.json());

    const playlistId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    const list = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${key}`
    ).then(r => r.json());

    const ids = list.items
      .map(i => i.snippet.resourceId.videoId)
      .join(",");

    const stats = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${key}`
    ).then(r => r.json());

    return stats.items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      views: Number(v.statistics.viewCount),
      date: v.snippet.publishedAt
    }));
  };

  const run = async () => {
    if (!channel.trim()) return;
    setLoading(true);
    setVideos([]);
    setAiTitles("");

    try {
      const data = await fetchVideos(channel);
      setVideos(data);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") run();
  };

  // FILTER
  const filtered = videos.filter(v =>
    minViews ? v.views >= Number(minViews) : true
  );

  // COPY
  const copyLinks = () => {
    navigator.clipboard.writeText(filtered.map(v => v.url).join("\n"));
    alert("Copied!");
  };

  // CSV
  const downloadCSV = () => {
    const rows = filtered.map(v =>
      `"${v.title}",${v.views},${new Date(v.date).toLocaleDateString()},${v.url}`
    );
    const csv = "Title,Views,Date,URL\n" + rows.join("\n");

    const blob = new Blob([csv]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "videos.csv";
    a.click();
  };

  // 🤖 AI FIXED
  const generateAI = async () => {
    const key = import.meta.env.VITE_OPENAI_KEY;

    if (!key) {
      setAiTitles("❌ Missing OpenAI Key");
      return;
    }

    setAiLoading(true);
    setAiTitles("");

    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: `Create 10 viral YouTube titles based on:\n${filtered.map(v => v.title).join("\n")}`
        })
      });

      const data = await res.json();

      console.log(data); // debug

      const text =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        "❌ AI returned empty response";

      setAiTitles(text);

    } catch (err) {
      setAiTitles("Error: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>YT Agent 🔥</h1>

      {/* INPUT */}
      <div style={styles.inputRow}>
        <input
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          onKeyDown={handleEnter}
          placeholder="Enter channel name"
          style={styles.input}
        />

        <button style={styles.btnRed} onClick={run}>
          {loading ? "Loading..." : "Extract"}
        </button>
      </div>

      {/* FILTER */}
      <input
        type="number"
        placeholder="Min views filter"
        value={minViews}
        onChange={(e) => setMinViews(e.target.value)}
        style={styles.filter}
      />

      {/* PANELS */}
      <div style={styles.grid}>

        {/* DETAILS */}
        <div style={styles.card}>
          <h3>📊 Video Details</h3>
          {filtered.map((v, i) => (
            <div key={v.id} style={styles.item}>
              <b>{i + 1}. {v.title}</b>
              <div>👀 {v.views.toLocaleString()}</div>
              <div>📅 {new Date(v.date).toLocaleDateString()}</div>
            </div>
          ))}
        </div>

        {/* LINKS */}
        <div style={styles.card}>
          <h3>🔗 Video Links</h3>

          <div style={{ marginBottom: 10 }}>
            <button style={styles.btnRed} onClick={copyLinks}>Copy</button>
            <button style={styles.btnGreen} onClick={downloadCSV}>CSV</button>
            <button style={styles.btnBlue} onClick={generateAI}>
              {aiLoading ? "AI..." : "AI Titles"}
            </button>
          </div>

          <ol>
            {filtered.map((v) => (
              <li key={v.id}>
                <a href={v.url} target="_blank" style={styles.link}>
                  {v.url}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* AI OUTPUT */}
      {aiTitles && (
        <div style={styles.aiBox}>
          <h3>🤖 AI Titles</h3>
          <pre>{aiTitles}</pre>
        </div>
      )}
    </div>
  );
}

// 🎨 STYLES
const styles = {
  container: {
    maxWidth: 1100,
    margin: "auto",
    padding: 20,
    background: "#0f172a",
    color: "#fff",
    minHeight: "100vh"
  },
  title: {
    textAlign: "center",
    color: "#ef4444"
  },
  inputRow: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginBottom: 15
  },
  input: {
    padding: 10,
    borderRadius: 8,
    width: 250
  },
  filter: {
    display: "block",
    margin: "auto",
    marginBottom: 20,
    padding: 8,
    borderRadius: 8
  },
  grid: {
    display: "flex",
    gap: 20
  },
  card: {
    flex: 1,
    background: "#1e293b",
    padding: 15,
    borderRadius: 12
  },
  item: {
    marginBottom: 10,
    borderBottom: "1px solid #333"
  },
  link: {
    color: "#60a5fa",
    wordBreak: "break-all"
  },
  btnRed: {
    background: "#ef4444",
    color: "#fff",
    padding: "8px 12px",
    border: "none",
    borderRadius: 6,
    marginRight: 6,
    cursor: "pointer"
  },
  btnGreen: {
    background: "#22c55e",
    color: "#fff",
    padding: "8px 12px",
    border: "none",
    borderRadius: 6,
    marginRight: 6,
    cursor: "pointer"
  },
  btnBlue: {
    background: "#3b82f6",
    color: "#fff",
    padding: "8px 12px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer"
  },
  aiBox: {
    marginTop: 30,
    background: "#111827",
    padding: 15,
    borderRadius: 10
  }
};
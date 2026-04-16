import { useState } from "react";

export default function App() {
  const [channel, setChannel] = useState("");
  const [minViews, setMinViews] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // FETCH YOUTUBE
  const fetchVideos = async (name) => {
    const key = import.meta.env.VITE_API_KEY;

    const search = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${name}&key=${key}`
    ).then(r => r.json());

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
      date: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails.medium.url
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
      alert("Channel not found");
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

  // AI
  const generateAI = async () => {
    const key = import.meta.env.VITE_OPENAI_KEY;

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

      if (!res.ok) {
        setAiTitles("⚠️ Add billing in OpenAI (quota exceeded)");
        return;
      }

      const text =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        "No response";

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
      <div style={styles.form}>
        <div>
          <label>Channel Name</label>
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            onKeyDown={handleEnter}
            placeholder="e.g. MrBeast"
          />
        </div>

        <div>
          <label>Minimum Views</label>
          <input
            type="number"
            value={minViews}
            onChange={(e) => setMinViews(e.target.value)}
            placeholder="100000"
          />
        </div>

        <button style={styles.extract} onClick={run}>
          {loading ? "Loading..." : "Extract"}
        </button>
      </div>

      <div style={styles.grid}>

        {/* LEFT */}
        <div style={styles.card}>
          <h3>📊 Video Details</h3>

          {filtered.map((v, i) => (
            <div key={v.id} style={styles.videoCard}>
              <img src={v.thumbnail} style={styles.thumb} />

              <div>
                <b>{i + 1}. {v.title}</b>
                <div>👀 {v.views.toLocaleString()}</div>
                <div>📅 {new Date(v.date).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div style={styles.card}>
          <h3>🔗 Links</h3>

          <div style={{ marginBottom: 10 }}>
            <button style={styles.red} onClick={copyLinks}>Copy</button>
            <button style={styles.green} onClick={downloadCSV}>CSV</button>
            <button style={styles.blue} onClick={generateAI}>
              {aiLoading ? "AI..." : "AI Titles"}
            </button>
          </div>

          <ol>
            {filtered.map(v => (
              <li key={v.id}>
                <a href={v.url} target="_blank" style={styles.link}>
                  {v.url}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* AI */}
      {aiTitles && (
        <div style={styles.ai}>
          <h3>🤖 AI Titles</h3>
          <pre>{aiTitles}</pre>
        </div>
      )}
    </div>
  );
}

// STYLES
const styles = {
  container: {
    maxWidth: 1100,
    margin: "auto",
    padding: 20,
    background: "#0f172a",
    color: "#fff"
  },
  title: { textAlign: "center", color: "#ef4444" },
  form: {
    display: "flex",
    gap: 20,
    justifyContent: "center",
    marginBottom: 20
  },
  extract: {
    background: "#ef4444",
    color: "#fff",
    padding: "10px 15px",
    borderRadius: 8
  },
  grid: { display: "flex", gap: 20 },
  card: {
    flex: 1,
    background: "#1e293b",
    padding: 15,
    borderRadius: 10
  },
  videoCard: {
    display: "flex",
    gap: 10,
    marginBottom: 10,
    borderBottom: "1px solid #333",
    paddingBottom: 10
  },
  thumb: { width: 120, borderRadius: 6 },
  red: { background: "#ef4444", marginRight: 6 },
  green: { background: "#22c55e", marginRight: 6 },
  blue: { background: "#3b82f6" },
  link: { color: "#60a5fa" },
  ai: {
    marginTop: 20,
    background: "#111827",
    padding: 15,
    borderRadius: 10
  }
};
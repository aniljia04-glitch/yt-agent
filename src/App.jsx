import { useState } from "react";

export default function App() {
  const [channel, setChannel] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // 🎥 FETCH YOUTUBE DATA
  const fetchVideosFromYouTube = async (channelName) => {
    const API_KEY = import.meta.env.VITE_API_KEY;

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channelName}&key=${API_KEY}`
    );
    const searchData = await searchRes.json();

    if (!searchData.items?.length) throw new Error("Channel not found");

    const channelId = searchData.items[0].snippet.channelId;

    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
    );
    const channelData = await channelRes.json();

    const uploadsPlaylistId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;

    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=20&key=${API_KEY}`
    );
    const videosData = await videosRes.json();

    const videoIds = videosData.items
      .map((item) => item.snippet.resourceId.videoId)
      .join(",");

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${API_KEY}`
    );
    const statsData = await statsRes.json();

    return statsData.items.map((item) => ({
      id: item.id,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      views: item.statistics.viewCount,
      date: item.snippet.publishedAt,
    }));
  };

  const run = async () => {
    if (!channel.trim()) return;

    setLoading(true);
    setVideos([]);

    try {
      const data = await fetchVideosFromYouTube(channel);
      setVideos(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 📋 COPY LINKS
  const copyAllLinks = () => {
    navigator.clipboard.writeText(videos.map(v => v.url).join("\n"));
    alert("Copied!");
  };

  // 📥 CSV DOWNLOAD
  const downloadCSV = () => {
    const rows = videos.map(v =>
      `"${v.title}",${v.views},${new Date(v.date).toLocaleDateString()},${v.url}`
    );
    const csv = "Title,Views,Date,URL\n" + rows.join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${channel}.csv`;
    a.click();
  };

  // 🤖 AI TITLES (FIXED)
  const generateAITitles = async () => {
    const key = import.meta.env.VITE_OPENAI_KEY;

    if (!key) {
      setAiTitles("❌ Missing OpenAI key in Vercel");
      return;
    }

    setAiLoading(true);
    setAiTitles("");

    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: `Create 10 viral YouTube titles based on:\n${videos.map(v => v.title).join("\n")}`
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiTitles("❌ " + JSON.stringify(data));
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
    <div style={{
      padding: 30,
      background: "#0f172a",
      color: "#e5e7eb",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif"
    }}>
      <h1 style={{ color: "#ef4444", marginBottom: 20 }}>
        YT Agent 🔥
      </h1>

      {/* INPUT */}
      <div style={{ marginBottom: 25 }}>
        <input
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="Enter channel name"
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #333",
            marginRight: 10,
            width: 250
          }}
        />

        <button
          onClick={run}
          style={{
            padding: "12px 20px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          {loading ? "Loading..." : "Extract"}
        </button>
      </div>

      {/* PANELS */}
      <div style={{ display: "flex", gap: 25 }}>

        {/* LEFT */}
        <div style={{
          flex: 1,
          background: "#1e293b",
          padding: 20,
          borderRadius: 12
        }}>
          <h3>📊 Video Details</h3>

          {videos.map((v, i) => (
            <div key={v.id} style={{ marginBottom: 15 }}>
              <b>{i + 1}. {v.title}</b><br />
              👀 {v.views} | 📅 {new Date(v.date).toLocaleDateString()}
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div style={{
          flex: 1,
          background: "#1e293b",
          padding: 20,
          borderRadius: 12
        }}>
          <h3>🔗 Links</h3>

          {/* BUTTON ROW */}
          <div style={{ marginBottom: 15 }}>
            <button style={btn("#ef4444")} onClick={copyAllLinks}>Copy</button>
            <button style={btn("#22c55e")} onClick={downloadCSV}>CSV</button>
            <button style={btn("#3b82f6")} onClick={generateAITitles}>
              {aiLoading ? "AI..." : "AI Titles"}
            </button>
          </div>

          {videos.map((v, i) => (
            <div key={v.id} style={{ marginBottom: 5 }}>
              {i + 1}. <a href={v.url} target="_blank">{v.url}</a>
            </div>
          ))}
        </div>
      </div>

      {/* AI OUTPUT */}
      {aiTitles && (
        <div style={{
          marginTop: 30,
          background: "#111827",
          padding: 20,
          borderRadius: 12
        }}>
          <h3>🤖 AI Titles</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{aiTitles}</pre>
        </div>
      )}
    </div>
  );
}

// 🎨 BUTTON STYLE
const btn = (bg) => ({
  padding: "10px 14px",
  marginRight: 10,
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
});
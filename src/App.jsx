import { useState } from "react";

export default function App() {
  const [channel, setChannel] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
      thumbnail: item.snippet.thumbnails.medium.url,
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

  const copyAllLinks = () => {
    navigator.clipboard.writeText(videos.map((v) => v.url).join("\n"));
    alert("Links copied!");
  };

  const downloadCSV = () => {
    const header = ["Title", "Views", "Date", "URL"];
    const rows = videos.map((v) => [
      `"${v.title}"`,
      v.views,
      new Date(v.date).toLocaleDateString(),
      v.url,
    ]);

    const csv = [header, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${channel}_videos.csv`;
    a.click();
  };

  const generateAITitles = async () => {
    const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY;
    const titles = videos.map((v) => v.title).join("\n");

    setAiLoading(true);
    setAiTitles("");

    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          input: `These are YouTube video titles:\n${titles}\n\nGenerate 10 viral YouTube titles.`,
        }),
      });

      const data = await res.json();
      const output = data.output?.[0]?.content?.[0]?.text || "No response";

      setAiTitles(output);
    } catch (err) {
      setAiTitles("Error: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, background: "#0a0a0a", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ color: "#ff0033" }}>YT Agent 🔥</h1>

      <input
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        placeholder="Enter channel name"
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={run}>
        {loading ? "Loading..." : "Extract"}
      </button>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>

        {/* LEFT */}
        <div style={{ flex: 1 }}>
          <h3>📊 Details</h3>
          {videos.map((v, i) => (
            <div key={v.id}>
              {i + 1}. {v.title} <br />
              👀 {v.views} | 📅 {new Date(v.date).toLocaleDateString()}
              <hr />
            </div>
          ))}
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1 }}>
          <h3>🔗 Links</h3>

          <button onClick={copyAllLinks}>Copy Links</button>
          <button onClick={downloadCSV}>Download CSV</button>
          <button onClick={generateAITitles}>
            {aiLoading ? "Generating..." : "AI Titles"}
          </button>

          {videos.map((v, i) => (
            <div key={v.id}>
              {i + 1}. <a href={v.url} target="_blank">{v.url}</a>
            </div>
          ))}
        </div>

      </div>

      {/* AI PANEL */}
      {aiTitles && (
        <div style={{ marginTop: 30, background: "#111", padding: 15 }}>
          <h3>🤖 AI Generated Titles</h3>
          <pre style={{ whiteSpace: "pre-wrap" }}>{aiTitles}</pre>
        </div>
      )}
    </div>
  );
}
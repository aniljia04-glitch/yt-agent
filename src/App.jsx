import { useState } from "react";

export default function App() {
  const [channel, setChannel] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchVideosFromYouTube = async (channelName) => {
    const API_KEY = import.meta.env.VITE_API_KEY;

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channelName}&key=${API_KEY}`
    );
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) {
      throw new Error("Channel not found");
    }

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
    const allLinks = videos.map((v) => v.url).join("\n");
    navigator.clipboard.writeText(allLinks);
    alert("All links copied!");
  };

  const downloadCSV = () => {
    const header = ["Title", "Views", "Date", "URL"];

    const rows = videos.map((v) => [
      `"${v.title}"`,
      v.views,
      new Date(v.date).toLocaleDateString(),
      v.url,
    ]);

    const csvContent = [header, ...rows]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${channel}_videos.csv`;
    a.click();
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial",
        background: "#0a0a0a",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#ff0033" }}>YT Agent 🔥</h1>

      {/* Input */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="Enter channel name (e.g. MrBeast)"
          style={{
            padding: 12,
            width: "300px",
            borderRadius: 8,
            border: "1px solid #333",
            marginRight: 10,
          }}
        />

        <button
          onClick={run}
          style={{
            padding: "12px 20px",
            background: "#ff0033",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {loading ? "Loading..." : "Extract"}
        </button>
      </div>

      {/* Two Panels */}
      <div style={{ display: "flex", gap: 20 }}>
        {/* LEFT PANEL */}
        <div
          style={{
            flex: 1,
            background: "#111",
            padding: 15,
            borderRadius: 10,
          }}
        >
          <h3>📊 Video Details</h3>

          {videos.map((v, i) => (
            <div
              key={v.id}
              style={{
                marginBottom: 15,
                borderBottom: "1px solid #222",
                paddingBottom: 10,
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {i + 1}. {v.title}
              </div>

              <div style={{ fontSize: 13, color: "#aaa" }}>
                👀 {Number(v.views).toLocaleString()} views
              </div>

              <div style={{ fontSize: 13, color: "#aaa" }}>
                📅 {new Date(v.date).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            flex: 1,
            background: "#111",
            padding: 15,
            borderRadius: 10,
          }}
        >
          <h3>🔗 Video Links</h3>

          <div style={{ marginBottom: 10 }}>
            <button
              onClick={copyAllLinks}
              style={{
                padding: "8px 12px",
                background: "#ff0033",
                border: "none",
                color: "#fff",
                borderRadius: 6,
                cursor: "pointer",
                marginRight: 10,
              }}
            >
              Copy All Links
            </button>

            <button
              onClick={downloadCSV}
              style={{
                padding: "8px 12px",
                background: "#22c55e",
                border: "none",
                color: "#fff",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Download CSV
            </button>
          </div>

          {videos.map((v, i) => (
            <div key={v.id} style={{ marginBottom: 8 }}>
              <a
                href={v.url}
                target="_blank"
                style={{ color: "#4da6ff", fontSize: 13 }}
              >
                {i + 1}. {v.url}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
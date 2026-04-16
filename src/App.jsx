import { useState } from "react";

export default function App() {
  const [channel, setChannel] = useState("");
  const [minViews, setMinViews] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

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

    const ids = list.items.map(i => i.snippet.resourceId.videoId).join(",");

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

    try {
      const data = await fetchVideos(channel);
      setVideos(data);
    } catch {
      alert("Channel not found");
    } finally {
      setLoading(false);
    }
  };

  const filtered = videos.filter(v =>
    minViews ? v.views >= Number(minViews) : true
  );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>YT Agent 🔥</h1>

      {/* FORM */}
      <div style={styles.formGrid}>
        <div style={styles.field}>
          <label>Channel Name</label>
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="MrBeast"
          />
        </div>

        <div style={styles.field}>
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

        {/* DETAILS */}
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

        {/* LINKS */}
        <div style={styles.card}>
          <h3>🔗 Links</h3>

          <ol style={styles.linkList}>
            {filtered.map((v) => (
              <li key={v.id} style={styles.linkItem}>
                <a href={v.url} target="_blank" style={styles.link}>
                  {v.url}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1100,
    margin: "auto",
    padding: 30,
    background: "#0f172a",
    color: "#fff"
  },

  title: {
    textAlign: "center",
    color: "#ef4444",
    marginBottom: 30
  },

  // ✅ PERFECT ALIGNMENT GRID
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: 20,
    alignItems: "end",
    marginBottom: 30
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },

  extract: {
    height: 40,
    padding: "0 20px",
    background: "#ef4444",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer"
  },

  grid: {
    display: "flex",
    gap: 20
  },

  card: {
    flex: 1,
    background: "#1e293b",
    padding: 20,
    borderRadius: 12
  },

  videoCard: {
    display: "flex",
    gap: 12,
    marginBottom: 15,
    borderBottom: "1px solid #333",
    paddingBottom: 10
  },

  thumb: {
    width: 140,
    height: 80,
    objectFit: "cover",
    borderRadius: 8
  },

  // ✅ FIXED LINKS
  linkList: {
    paddingLeft: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  linkItem: {
    lineHeight: 1.5
  },

  link: {
    color: "#60a5fa",
    wordBreak: "break-all",
    textDecoration: "none"
  }
};
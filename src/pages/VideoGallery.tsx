import scene1 from "@/assets/video-scene-1-chaos.png";
import scene2 from "@/assets/video-scene-2-clarity-morning.png";
import scene3 from "@/assets/video-scene-3-everything-organized.png";
import scene4 from "@/assets/video-scene-4-guided-execution.png";
import scene5 from "@/assets/video-scene-5-team-collaboration.png";
import scene6 from "@/assets/video-scene-6-results.png";
import scene7 from "@/assets/video-scene-7-closing.png";

const VideoGallery = () => {
  const scenes = [
    { id: 1, src: scene1, title: "Scene 1: Chaos", filename: "video-scene-1-chaos.png" },
    { id: 2, src: scene2, title: "Scene 2: Clarity Morning", filename: "video-scene-2-clarity-morning.png" },
    { id: 3, src: scene3, title: "Scene 3: Everything Organized", filename: "video-scene-3-everything-organized.png" },
    { id: 4, src: scene4, title: "Scene 4: Guided Execution", filename: "video-scene-4-guided-execution.png" },
    { id: 5, src: scene5, title: "Scene 5: Team Collaboration", filename: "video-scene-5-team-collaboration.png" },
    { id: 6, src: scene6, title: "Scene 6: Results", filename: "video-scene-6-results.png" },
    { id: 7, src: scene7, title: "Scene 7: Closing", filename: "video-scene-7-closing.png" },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Video Scene Gallery</h1>
          <p className="text-muted-foreground">
            Right-click any image and select "Save image as..." to download (1920x1080px)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <img
                src={scene.src}
                alt={scene.title}
                className="w-full h-auto cursor-pointer"
                draggable={true}
              />
              <div className="p-4">
                <h3 className="font-semibold text-card-foreground">{scene.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{scene.filename}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoGallery;

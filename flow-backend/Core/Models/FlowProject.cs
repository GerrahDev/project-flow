using System.Text.Json.Serialization;

namespace Flow.Backend.Core.Models;

/// <summary>
/// Core project metadata and settings
/// Contains only project-level information, no assets or objects
/// </summary>
public class FlowProject
{
    public string Name { get; set; } = "Untitled Project";
    public string Version { get; set; } = "1.0.0";
    public DateTime CreatedDate { get; set; } = DateTime.Now;
    public DateTime LastModified { get; set; } = DateTime.Now;
    
    // Project configuration
    public ProjectCanvas Canvas { get; set; } = new();
    public ProjectTimeline Timeline { get; set; } = new();

    //modular system connections 
    public FlowAsset Assets { get; set; } = new();
    public FlowScene Scene { get; set; } = new();

    /// <summary>
    /// Basic validation for project data
    /// </summary>
    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(Name) && 
               Canvas.IsValid() && 
               Timeline.IsValid();
    }

    /// <summary>
    /// Update last modified timestamp
    /// </summary>
    public void MarkAsModified()
    {
        LastModified = DateTime.Now;
    }
}

/// <summary>
/// Canvas configuration and rendering settings
/// </summary>
public class ProjectCanvas
{
    public int Width { get; set; } = 1920;
    public int Height { get; set; } = 1080;
    public string BackgroundColor { get; set; } = "#000000";
    public double FrameRate { get; set; } = 30.0;

    /// <summary>
    /// Validate canvas settings
    /// </summary>
    public bool IsValid()
    {
        return Width > 0 && 
               Height > 0 && 
               FrameRate > 0 && 
               !string.IsNullOrWhiteSpace(BackgroundColor);
    }

    /// <summary>
    /// Get aspect ratio of canvas
    /// </summary>
    public double AspectRatio => (double)Width / Height;

    /// <summary>
    /// Check if canvas is standard resolution
    /// </summary>
    public bool IsStandardResolution()
    {
        return (Width == 1920 && Height == 1080) ||  // 1080p
               (Width == 1280 && Height == 720) ||   // 720p  
               (Width == 3840 && Height == 2160) ||  // 4K
               (Width == 1920 && Height == 1200);    // WUXGA
    }
}

/// <summary>
/// Timeline configuration and playback settings
/// </summary>
public class ProjectTimeline
{
    public TimeSpan Duration { get; set; } = TimeSpan.FromSeconds(10);
    public TimeSpan CurrentTime { get; set; } = TimeSpan.Zero;
    public double Zoom { get; set; } = 1.0;
    public bool IsPlaying { get; set; } = false;

    /// <summary>
    /// Validate timeline settings
    /// </summary>
    public bool IsValid()
    {
        return Duration > TimeSpan.Zero && 
               CurrentTime >= TimeSpan.Zero && 
               CurrentTime <= Duration &&
               Zoom > 0;
    }

    /// <summary>
    /// Get current time as frame number
    /// </summary>
    public int GetCurrentFrame(double frameRate)
    {
        return (int)(CurrentTime.TotalSeconds * frameRate);
    }

    /// <summary>
    /// Get total frame count
    /// </summary>
    public int GetTotalFrames(double frameRate)
    {
        return (int)(Duration.TotalSeconds * frameRate);
    }

    /// <summary>
    /// Set current time from frame number
    /// </summary>
    public void SetCurrentFrame(int frameNumber, double frameRate)
    {
        if (frameRate <= 0) return;
        
        var timeInSeconds = frameNumber / frameRate;
        CurrentTime = TimeSpan.FromSeconds(Math.Max(0, Math.Min(timeInSeconds, Duration.TotalSeconds)));
    }

    /// <summary>
    /// Get playback progress as percentage (0-1)
    /// </summary>
    public double GetProgress()
    {
        if (Duration.TotalSeconds <= 0) return 0;
        return CurrentTime.TotalSeconds / Duration.TotalSeconds;
    }
}
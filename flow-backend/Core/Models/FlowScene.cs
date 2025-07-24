using System.Text.Json.Serialization;

namespace Flow.Backend.Core.Models;

/// <summary>
/// Scene composition system for managing FlowObjects and hierarchy
/// Contains all objects in the scene and their relationships
/// </summary>
public class FlowScene
{
    public List<FlowObject> Objects { get; set; } = new();
    public int NextZOrder { get; set; } = 1;
    public string SelectedObjectId { get; set; } = "";

    /// <summary>
    /// Get total object count
    /// </summary>
    public int TotalObjectCount => Objects.Count;

    /// <summary>
    /// Find object by ID
    /// </summary>
    public FlowObject? FindObject(string objectId)
    {
        return Objects.FirstOrDefault(obj => obj.Id == objectId);
    }

    /// <summary>
    /// Get objects by type
    /// </summary>
    public List<FlowObject> GetObjectsByType(FlowObjectType type)
    {
        return Objects.Where(obj => obj.Type == type).ToList();
    }

    /// <summary>
    /// Get root-level objects (no parent)
    /// </summary>
    public List<FlowObject> GetRootObjects()
    {
        return Objects.Where(obj => string.IsNullOrWhiteSpace(obj.ParentId)).ToList();
    }

    /// <summary>
    /// Get child objects of specific parent
    /// </summary>
    public List<FlowObject> GetChildObjects(string parentId)
    {
        return Objects.Where(obj => obj.ParentId == parentId).ToList();
    }

    /// <summary>
    /// Get next available Z-order value
    /// </summary>
    public int GetNextZOrder()
    {
        return NextZOrder++;
    }

    /// <summary>
    /// Validate scene data
    /// </summary>
    public bool IsValid()
    {
        return Objects.All(obj => obj.IsValid());
    }
}

/// <summary>
/// Individual object in the scene (shapes, text, media, etc.)
/// </summary>
public class FlowObject
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public FlowObjectType Type { get; set; }
    public int ZOrder { get; set; }
    public string ParentId { get; set; } = ""; // Empty for root level
    
    // Spatial properties
    public Transform Transform { get; set; } = new();
    
    // Temporal behavior - how object exists in time
    public TemporalBehavior Temporal { get; set; } = new();
    
    // Type-specific data
    public ObjectTypeData TypeData { get; set; } = new();
    
    // Asset reference (for Sprite, Video, Audio objects)
    public string ReferencedAssetId { get; set; } = "";

    /// <summary>
    /// Check if this is a root-level object
    /// </summary>
    public bool IsRootObject => string.IsNullOrWhiteSpace(ParentId);

    /// <summary>
    /// Check if this object references an asset
    /// </summary>
    public bool HasAssetReference => !string.IsNullOrWhiteSpace(ReferencedAssetId);

    /// <summary>
    /// Get display name for UI
    /// </summary>
    public string DisplayName => !string.IsNullOrWhiteSpace(Name) ? Name : $"{Type} {Id[..8]}";

    /// <summary>
    /// Validate object data
    /// </summary>
    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(Id) &&
               Transform.IsValid() &&
               Temporal.IsValid();
    }
}

/// <summary>
/// Transform properties for object positioning and appearance
/// </summary>
public class Transform
{
    public Vector2 Position { get; set; } = new();
    public Vector2 Scale { get; set; } = new(1.0, 1.0);
    public double Rotation { get; set; } = 0.0; // degrees
    public double Opacity { get; set; } = 1.0;
    public Vector2 AnchorPoint { get; set; } = new(0.5, 0.5); // 0-1 normalized

    /// <summary>
    /// Check if transform has default values
    /// </summary>
    public bool IsDefault => Position.IsZero && Scale.IsOne && Rotation == 0.0 && Opacity == 1.0;

    /// <summary>
    /// Reset transform to default values
    /// </summary>
    public void Reset()
    {
        Position = new Vector2();
        Scale = new Vector2(1.0, 1.0);
        Rotation = 0.0;
        Opacity = 1.0;
        AnchorPoint = new Vector2(0.5, 0.5);
    }

    /// <summary>
    /// Validate transform data
    /// </summary>
    public bool IsValid()
    {
        return Position.IsValid() &&
               Scale.IsValid() &&
               Opacity >= 0.0 && Opacity <= 1.0 &&
               AnchorPoint.IsValid();
    }
}

/// <summary>
/// 2D vector for positions, scales, and other coordinate pairs
/// </summary>
public class Vector2
{
    public double X { get; set; }
    public double Y { get; set; }
    
    public Vector2() { }
    public Vector2(double x, double y) { X = x; Y = y; }

    /// <summary>
    /// Check if vector is zero
    /// </summary>
    public bool IsZero => X == 0.0 && Y == 0.0;

    /// <summary>
    /// Check if vector is one (for scale)
    /// </summary>
    public bool IsOne => X == 1.0 && Y == 1.0;

    /// <summary>
    /// Get magnitude of vector
    /// </summary>
    public double Magnitude => Math.Sqrt(X * X + Y * Y);

    /// <summary>
    /// Validate vector data
    /// </summary>
    public bool IsValid()
    {
        return !double.IsNaN(X) && !double.IsNaN(Y) &&
               !double.IsInfinity(X) && !double.IsInfinity(Y);
    }

    public override string ToString() => $"({X:F2}, {Y:F2})";
}

/// <summary>
/// Temporal behavior - unified timeline approach for objects
/// </summary>
public class TemporalBehavior
{
    public TimeSpan StartTime { get; set; } = TimeSpan.Zero;
    public TimeSpan Duration { get; set; } = TimeSpan.FromSeconds(10);
    public TemporalMode Mode { get; set; } = TemporalMode.PropertyAnimation;
    
    // For Clip Mode (video/audio editing)
    public ClipData? ClipData { get; set; }
    
    // For Frame Content Mode (2D animation)  
    public FrameData? FrameData { get; set; }
    
    // Property animation tracks (always available)
    public Dictionary<string, PropertyTrack> PropertyTracks { get; set; } = new();

    /// <summary>
    /// Check if object is active at given time
    /// </summary>
    public bool IsActiveAt(TimeSpan time)
    {
        return time >= StartTime && time <= StartTime + Duration;
    }

    /// <summary>
    /// Get relative time within object's duration
    /// </summary>
    public TimeSpan GetRelativeTime(TimeSpan globalTime)
    {
        return globalTime - StartTime;
    }

    /// <summary>
    /// Validate temporal behavior
    /// </summary>
    public bool IsValid()
    {
        return StartTime >= TimeSpan.Zero &&
               Duration > TimeSpan.Zero;
    }
}

/// <summary>
/// Clip behavior data for video/audio editing mode
/// </summary>
public class ClipData
{
    public TimeSpan SourceStartTime { get; set; } = TimeSpan.Zero; // Trim in point
    public TimeSpan SourceDuration { get; set; } = TimeSpan.FromSeconds(10); // Original duration
    public bool IsLooping { get; set; } = false;
    public double PlaybackSpeed { get; set; } = 1.0;

    /// <summary>
    /// Validate clip data
    /// </summary>
    public bool IsValid()
    {
        return SourceStartTime >= TimeSpan.Zero &&
               SourceDuration > TimeSpan.Zero &&
               PlaybackSpeed > 0.0;
    }
}

/// <summary>
/// Frame content data for 2D animation mode
/// </summary>
public class FrameData
{
    public Dictionary<int, FrameContent> Frames { get; set; } = new(); // Frame number -> content
    public int OnionSkinBefore { get; set; } = 3;
    public int OnionSkinAfter { get; set; } = 3;

    /// <summary>
    /// Get total frame count
    /// </summary>
    public int TotalFrames => Frames.Count;

    /// <summary>
    /// Check if frame has content
    /// </summary>
    public bool HasFrameContent(int frameNumber)
    {
        return Frames.ContainsKey(frameNumber) && !Frames[frameNumber].IsEmpty;
    }
}

/// <summary>
/// Content for a specific frame in 2D animation
/// </summary>
public class FrameContent
{
    public string DrawingData { get; set; } = ""; // Vector drawing data
    public bool IsEmpty { get; set; } = true;
    public DateTime LastModified { get; set; } = DateTime.Now;
}

/// <summary>
/// Property animation track for keyframe animation
/// </summary>
public class PropertyTrack
{
    public string PropertyPath { get; set; } = ""; // e.g., "transform.position.x"
    public List<Keyframe> Keyframes { get; set; } = new();
    public InterpolationType Interpolation { get; set; } = InterpolationType.Linear;

    /// <summary>
    /// Get value at specific time
    /// </summary>
    public object? GetValueAt(TimeSpan time)
    {
        if (Keyframes.Count == 0) return null;
        if (Keyframes.Count == 1) return Keyframes[0].Value;

        // Find surrounding keyframes and interpolate
        var beforeKeyframe = Keyframes.LastOrDefault(k => k.Time <= time);
        var afterKeyframe = Keyframes.FirstOrDefault(k => k.Time > time);

        if (beforeKeyframe == null) return Keyframes[0].Value;
        if (afterKeyframe == null) return Keyframes[^1].Value;

        // Simple linear interpolation for now
        var factor = (time - beforeKeyframe.Time).TotalSeconds / 
                    (afterKeyframe.Time - beforeKeyframe.Time).TotalSeconds;
        
        // TODO: Implement proper interpolation based on value types
        return beforeKeyframe.Value;
    }
}

/// <summary>
/// Individual keyframe in animation
/// </summary>
public class Keyframe
{
    public TimeSpan Time { get; set; }
    public object Value { get; set; } = 0.0;
    public EasingType Easing { get; set; } = EasingType.Linear;
}

/// <summary>
/// Type-specific object data for different object types
/// </summary>
public class ObjectTypeData
{
    // Shape objects
    public ShapeData? ShapeData { get; set; }
    
    // Text objects
    public TextData? TextData { get; set; }
    
    // Sprite objects (references asset)
    public SpriteData? SpriteData { get; set; }
    
    // Video objects (references asset)
    public VideoData? VideoData { get; set; }
    
    // Audio objects (references asset)  
    public AudioData? AudioData { get; set; }
}

/// <summary>
/// Shape-specific properties
/// </summary>
public class ShapeData
{
    public ShapeType ShapeType { get; set; } = ShapeType.Rectangle;
    public string FillColor { get; set; } = "#FFFFFF";
    public string StrokeColor { get; set; } = "#000000";
    public double StrokeWidth { get; set; } = 1.0;
    public Vector2 Size { get; set; } = new(100, 100);
}

/// <summary>
/// Text-specific properties
/// </summary>
public class TextData
{
    public string Content { get; set; } = "Text";
    public string FontFamily { get; set; } = "Arial";
    public double FontSize { get; set; } = 24.0;
    public string Color { get; set; } = "#FFFFFF";
    public bool IsBold { get; set; } = false;
    public bool IsItalic { get; set; } = false;
    public TextAlign Alignment { get; set; } = TextAlign.Left;
}

/// <summary>
/// Sprite-specific properties (image references)
/// </summary>
public class SpriteData
{
    public bool MaintainAspectRatio { get; set; } = true;
    public FilterMode FilterMode { get; set; } = FilterMode.Bilinear;
}

/// <summary>
/// Video-specific properties
/// </summary>
public class VideoData
{
    public bool MaintainAspectRatio { get; set; } = true;
    public double Volume { get; set; } = 1.0;
    public bool IsMuted { get; set; } = false;
}

/// <summary>
/// Audio-specific properties
/// </summary>
public class AudioData
{
    public double Volume { get; set; } = 1.0;
    public bool IsMuted { get; set; } = false;
    public WaveformData? WaveformCache { get; set; }
}

/// <summary>
/// Cached waveform data for audio visualization
/// </summary>
public class WaveformData
{
    public double[] Amplitudes { get; set; } = Array.Empty<double>();
    public double SampleRate { get; set; } = 44100;
    public int Channels { get; set; } = 2;
}

// Enums for object system
public enum FlowObjectType
{
    Rectangle,
    Circle,
    Polygon,
    Text,
    Sprite,     // References image asset
    Video,      // References video asset
    Audio,      // References audio asset
    Group       // Container for other objects
}

public enum TemporalMode
{
    PropertyAnimation,  // Object exists full duration, properties animate
    Clip,              // Object has in/out points, can be trimmed
    FrameContent       // Object content changes per frame
}

public enum ShapeType
{
    Rectangle,
    Circle,
    Polygon,
    Path
}

public enum TextAlign
{
    Left,
    Center,
    Right,
    Justify
}

public enum FilterMode
{
    Point,
    Bilinear,
    Trilinear
}

public enum InterpolationType
{
    Linear,
    Bezier,
    Hold,
    Bounce
}

public enum EasingType
{
    Linear,
    EaseIn,
    EaseOut,
    EaseInOut,
    Custom
}
using System.Text.Json.Serialization;

namespace Flow.Backend.Core.Models;

/// <summary>
/// Asset management system for imported files and user organization
/// Handles all asset-related data and folder structure
/// </summary>
public class FlowAsset
{
    public string AssetsFolderPath { get; set; } = "Assets";
    public List<ImportedAsset> ImportedAssets { get; set; } = new();
    public List<AssetFolder> UserFolders { get; set; } = new();

    /// <summary>
    /// Get total number of assets
    /// </summary>
    public int TotalAssetCount => ImportedAssets.Count;

    /// <summary>
    /// Get assets by type
    /// </summary>
    public List<ImportedAsset> GetAssetsByType(AssetType type)
    {
        return ImportedAssets.Where(asset => asset.Type == type).ToList();
    }

    /// <summary>
    /// Find asset by ID
    /// </summary>
    public ImportedAsset? FindAsset(string assetId)
    {
        return ImportedAssets.FirstOrDefault(asset => asset.Id == assetId);
    }

    /// <summary>
    /// Find folder by ID
    /// </summary>
    public AssetFolder? FindFolder(string folderId)
    {
        return UserFolders.FirstOrDefault(folder => folder.Id == folderId);
    }

    /// <summary>
    /// Get assets in specific folder
    /// </summary>
    public List<ImportedAsset> GetAssetsInFolder(string folderPath)
    {
        return ImportedAssets.Where(asset => 
            Path.GetDirectoryName(asset.RelativePath)?.Replace('\\', '/') == folderPath.Replace('\\', '/')
        ).ToList();
    }

    /// <summary>
    /// Validate asset management data
    /// </summary>
    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(AssetsFolderPath) &&
               ImportedAssets.All(asset => asset.IsValid()) &&
               UserFolders.All(folder => folder.IsValid());
    }
}

/// <summary>
/// Imported asset representing an external file
/// </summary>
public class ImportedAsset
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string FileName { get; set; } = "";
    public string RelativePath { get; set; } = ""; // Relative to project folder
    public AssetType Type { get; set; }
    public DateTime ImportedDate { get; set; } = DateTime.Now;
    public AssetMetadata Metadata { get; set; } = new();

    /// <summary>
    /// Get file extension from filename
    /// </summary>
    public string FileExtension => Path.GetExtension(FileName).ToLowerInvariant();

    /// <summary>
    /// Check if asset is image type
    /// </summary>
    public bool IsImage => Type == AssetType.Image;

    /// <summary>
    /// Check if asset is video type
    /// </summary>
    public bool IsVideo => Type == AssetType.Video;

    /// <summary>
    /// Check if asset is audio type
    /// </summary>
    public bool IsAudio => Type == AssetType.Audio;

    /// <summary>
    /// Get display name for UI
    /// </summary>
    public string DisplayName => !string.IsNullOrWhiteSpace(Name) ? Name : Path.GetFileNameWithoutExtension(FileName);

    /// <summary>
    /// Validate asset data
    /// </summary>
    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(Id) &&
               !string.IsNullOrWhiteSpace(FileName) &&
               !string.IsNullOrWhiteSpace(RelativePath) &&
               Metadata.IsValid();
    }

    /// <summary>
    /// Get formatted file size for display
    /// </summary>
    public string GetFormattedFileSize()
    {
        return Metadata.GetFormattedFileSize();
    }
}

/// <summary>
/// User-created folders for asset organization
/// </summary>
public class AssetFolder
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "";
    public string RelativePath { get; set; } = "";
    public string ParentFolderId { get; set; } = ""; // Empty for root level
    public DateTime CreatedDate { get; set; } = DateTime.Now;

    /// <summary>
    /// Check if this is a root-level folder
    /// </summary>
    public bool IsRootFolder => string.IsNullOrWhiteSpace(ParentFolderId);

    /// <summary>
    /// Get folder depth in hierarchy
    /// </summary>
    public int GetDepth()
    {
        if (string.IsNullOrWhiteSpace(RelativePath)) return 0;
        return RelativePath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar).Length;
    }

    /// <summary>
    /// Validate folder data
    /// </summary>
    public bool IsValid()
    {
        return !string.IsNullOrWhiteSpace(Id) &&
               !string.IsNullOrWhiteSpace(Name) &&
               !string.IsNullOrWhiteSpace(RelativePath);
    }
}

/// <summary>
/// Metadata about imported asset files
/// </summary>
public class AssetMetadata
{
    public long FileSizeBytes { get; set; }
    public string FileFormat { get; set; } = "";
    
    // Image/Video metadata
    public int? Width { get; set; }
    public int? Height { get; set; }
    public TimeSpan? Duration { get; set; }
    public double? FrameRate { get; set; }
    
    // Audio metadata
    public int? SampleRate { get; set; }
    public int? Channels { get; set; }
    public int? BitRate { get; set; }

    /// <summary>
    /// Check if asset has dimensions (image/video)
    /// </summary>
    public bool HasDimensions => Width.HasValue && Height.HasValue;

    /// <summary>
    /// Get aspect ratio if dimensions available
    /// </summary>
    public double? AspectRatio => HasDimensions ? (double)Width!.Value / Height!.Value : null;

    /// <summary>
    /// Check if asset has duration (video/audio)
    /// </summary>
    public bool HasDuration => Duration.HasValue && Duration.Value > TimeSpan.Zero;

    /// <summary>
    /// Get formatted file size for display
    /// </summary>
    public string GetFormattedFileSize()
    {
        if (FileSizeBytes < 1024) return $"{FileSizeBytes} B";
        if (FileSizeBytes < 1024 * 1024) return $"{FileSizeBytes / 1024:F1} KB";
        if (FileSizeBytes < 1024 * 1024 * 1024) return $"{FileSizeBytes / (1024 * 1024):F1} MB";
        return $"{FileSizeBytes / (1024 * 1024 * 1024):F1} GB";
    }

    /// <summary>
    /// Get formatted duration for display
    /// </summary>
    public string GetFormattedDuration()
    {
        if (!HasDuration) return "";
        
        var duration = Duration!.Value;
        if (duration.TotalHours >= 1)
            return duration.ToString(@"h\:mm\:ss");
        else
            return duration.ToString(@"m\:ss");
    }

    /// <summary>
    /// Get formatted dimensions for display
    /// </summary>
    public string GetFormattedDimensions()
    {
        return HasDimensions ? $"{Width} × {Height}" : "";
    }

    /// <summary>
    /// Validate metadata
    /// </summary>
    public bool IsValid()
    {
        return FileSizeBytes >= 0 &&
               !string.IsNullOrWhiteSpace(FileFormat);
    }
}

/// <summary>
/// Types of assets that can be imported
/// </summary>
public enum AssetType
{
    Image,      // PNG, JPG, SVG, PSD
    Video,      // MP4, MOV, AVI
    Audio,      // MP3, WAV, AAC
    Vector,     // AI, EPS
    Other       // Unknown or unsupported file types
}
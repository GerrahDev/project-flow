using System.Text.Json;
using Microsoft.Extensions.Logging;
using Flow.Backend.Core.Models;

namespace Flow.Backend.Core.Services;

public class ProjectService
{
    private readonly ILogger<ProjectService> _logger;
    private FlowProject? _currentProject;
    private string _currentProjectPath = "";

    public ProjectService(ILogger<ProjectService> logger)
    {
        _logger = logger;
    }

    // Events for UI updates
    public event Action<FlowProject>? ProjectLoaded;
    public event Action? ProjectClosed;
    public event Action<FlowProject>? ProjectUpdated;

    public FlowProject? CurrentProject => _currentProject;
    public string CurrentProjectPath => _currentProjectPath;
    public bool HasProject => _currentProject != null;

    /// <summary>
    /// Create a new project with default settings
    /// </summary>
    public async Task<FlowProject> CreateProjectAsync(string name = "Untitled Project", string? filePath = null)
    {
        _logger.LogInformation("Creating new project: {ProjectName}", name);

        var project = new FlowProject
        {
            Name = name,
            Version = "1.0.0",
            CreatedDate = DateTime.Now,
            LastModified = DateTime.Now,
            Canvas = new ProjectCanvas
            {
                Width = 1920,
                Height = 1080,
                BackgroundColor = "#000000",
                FrameRate = 30.0
            },
            Timeline = new ProjectTimeline
            {
                Duration = TimeSpan.FromSeconds(10),
                CurrentTime = TimeSpan.Zero,
                Zoom = 1.0,
                IsPlaying = false
            },
            Assets = new FlowAsset
            {
                AssetsFolderPath = "Assets",
                ImportedAssets = new List<ImportedAsset>(),
                UserFolders = new List<AssetFolder>()
            },
            Scene = new FlowScene
            {
                Objects = new List<FlowObject>(),
                NextZOrder = 1,
                SelectedObjectId = ""
            }
        };

        // If file path provided, create the Assets folder structure
        if (!string.IsNullOrEmpty(filePath))
        {
            await CreateProjectStructureAsync(filePath, project);
        }

        _currentProject = project;
        _currentProjectPath = filePath ?? "";

        _logger.LogInformation("✅ Project created successfully");
        ProjectLoaded?.Invoke(project);
        
        return project;
    }

    /// <summary>
    /// Update project settings (name, canvas, timeline)
    /// </summary>
    public async Task<FlowProject> UpdateProjectSettingsAsync(
        string? name = null,
        ProjectCanvas? canvas = null,
        ProjectTimeline? timeline = null)
    {
        if (_currentProject == null)
            throw new InvalidOperationException("No project is currently loaded");

        _logger.LogInformation("Updating project settings");

        // Update provided settings
        if (!string.IsNullOrEmpty(name))
        {
            _currentProject.Name = name;
            _logger.LogInformation("Project name updated to: {ProjectName}", name);
        }

        if (canvas != null)
        {
            _currentProject.Canvas = canvas;
            _logger.LogInformation("Canvas settings updated: {Width}x{Height}", canvas.Width, canvas.Height);
        }

        if (timeline != null)
        {
            _currentProject.Timeline = timeline;
            _logger.LogInformation("Timeline settings updated: Duration={Duration}", timeline.Duration);
        }

        // Update last modified time
        _currentProject.LastModified = DateTime.Now;

        ProjectUpdated?.Invoke(_currentProject);
        return _currentProject;
    }

    /// <summary>
    /// Save current project to file
    /// </summary>
    public async Task<string> SaveProjectAsync(string? filePath = null)
    {
        if (_currentProject == null)
            throw new InvalidOperationException("No project to save");

        // Use provided path or current path
        var saveFilePath = filePath ?? _currentProjectPath;
        
        if (string.IsNullOrEmpty(saveFilePath))
            throw new ArgumentException("File path must be provided for new projects");

        _logger.LogInformation("Saving project to: {FilePath}", saveFilePath);

        try
        {
            // Update last modified time
            _currentProject.LastModified = DateTime.Now;

            // Create project directory if it doesn't exist
            var projectDirectory = Path.GetDirectoryName(saveFilePath);
            if (!string.IsNullOrEmpty(projectDirectory) && !Directory.Exists(projectDirectory))
            {
                Directory.CreateDirectory(projectDirectory);
                _logger.LogInformation("Created project directory: {Directory}", projectDirectory);
            }

            // Create Assets folder structure if saving to new location
            if (filePath != null && filePath != _currentProjectPath)
            {
                await CreateProjectStructureAsync(saveFilePath, _currentProject);
            }

            // Serialize project to JSON
            var options = new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var jsonString = JsonSerializer.Serialize(_currentProject, options);
            await File.WriteAllTextAsync(saveFilePath, jsonString);

            // Update current path
            _currentProjectPath = saveFilePath;

            _logger.LogInformation("✅ Project saved successfully");
            ProjectUpdated?.Invoke(_currentProject);

            return saveFilePath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to save project");
            throw;
        }
    }

    /// <summary>
    /// Load project from file
    /// </summary>
    public async Task<FlowProject> LoadProjectAsync(string filePath)
    {
        _logger.LogInformation("Loading project from: {FilePath}", filePath);

        try
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException($"Project file not found: {filePath}");

            // Read and deserialize project file
            var jsonString = await File.ReadAllTextAsync(filePath);
            
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var project = JsonSerializer.Deserialize<FlowProject>(jsonString, options);
            
            if (project == null)
                throw new InvalidOperationException("Failed to deserialize project file");

            // Validate project structure
            await ValidateProjectStructureAsync(filePath, project);

            // Set as current project
            _currentProject = project;
            _currentProjectPath = filePath;

            _logger.LogInformation("✅ Project loaded successfully: {ProjectName}", project.Name);
            ProjectLoaded?.Invoke(project);

            return project;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to load project");
            throw;
        }
    }

    /// <summary>
    /// Close current project
    /// </summary>
    public async Task CloseProjectAsync()
    {
        if (_currentProject == null)
        {
            _logger.LogWarning("No project to close");
            return;
        }

        _logger.LogInformation("Closing project: {ProjectName}", _currentProject.Name);

        _currentProject = null;
        _currentProjectPath = "";

        ProjectClosed?.Invoke();
        _logger.LogInformation("✅ Project closed");
    }

    /// <summary>
    /// Get project information for UI display
    /// </summary>
    public object GetProjectInfo()
    {
        if (_currentProject == null)
            return new { hasProject = false };

        var lastSaved = File.Exists(_currentProjectPath) 
            ? File.GetLastWriteTime(_currentProjectPath)
            : _currentProject.LastModified;

        return new
        {
            hasProject = true,
            name = _currentProject.Name,
            canvas = new
            {
                width = _currentProject.Canvas.Width,
                height = _currentProject.Canvas.Height,
                backgroundColor = _currentProject.Canvas.BackgroundColor,
                frameRate = _currentProject.Canvas.FrameRate
            },
            timeline = new
            {
                duration = _currentProject.Timeline.Duration.ToString(@"hh\:mm\:ss"),
                currentTime = _currentProject.Timeline.CurrentTime.ToString(@"hh\:mm\:ss")
            },
            stats = new
            {
                objectCount = _currentProject.Scene.Objects.Count,
                assetCount = _currentProject.Assets.ImportedAssets.Count,
                createdDate = _currentProject.CreatedDate.ToString("yyyy-MM-dd"),
                lastModified = lastSaved.ToString("yyyy-MM-dd HH:mm")
            },
            filePath = Path.GetFileName(_currentProjectPath)
        };
    }

    /// <summary>
    /// Create project folder structure including Assets folder
    /// </summary>
    private async Task CreateProjectStructureAsync(string projectFilePath, FlowProject project)
    {
        var projectDirectory = Path.GetDirectoryName(projectFilePath);
        if (string.IsNullOrEmpty(projectDirectory))
            return;

        // Create project directory
        if (!Directory.Exists(projectDirectory))
        {
            Directory.CreateDirectory(projectDirectory);
            _logger.LogInformation("Created project directory: {Directory}", projectDirectory);
        }

        // Create Assets folder
        var assetsPath = Path.Combine(projectDirectory, project.Assets.AssetsFolderPath);
        if (!Directory.Exists(assetsPath))
        {
            Directory.CreateDirectory(assetsPath);
            _logger.LogInformation("Created Assets folder: {AssetsPath}", assetsPath);
        }

        // Create user-defined folders if any
        foreach (var folder in project.Assets.UserFolders)
        {
            var folderPath = Path.Combine(assetsPath, folder.RelativePath);
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
                _logger.LogInformation("Created user folder: {FolderPath}", folderPath);
            }
        }
    }

    /// <summary>
    /// Validate that project structure exists on disk
    /// </summary>
    private async Task ValidateProjectStructureAsync(string projectFilePath, FlowProject project)
    {
        var projectDirectory = Path.GetDirectoryName(projectFilePath);
        if (string.IsNullOrEmpty(projectDirectory))
            return;

        // Check if Assets folder exists
        var assetsPath = Path.Combine(projectDirectory, project.Assets.AssetsFolderPath);
        if (!Directory.Exists(assetsPath))
        {
            _logger.LogWarning("Assets folder missing, creating: {AssetsPath}", assetsPath);
            Directory.CreateDirectory(assetsPath);
        }

        // Validate imported assets exist on disk
        foreach (var asset in project.Assets.ImportedAssets)
        {
            var assetPath = Path.Combine(projectDirectory, asset.RelativePath);
            if (!File.Exists(assetPath))
            {
                _logger.LogWarning("Asset file missing: {AssetPath}", assetPath);
                // Could mark asset as missing or remove from list
            }
        }
    }

    /// <summary>
    /// Get Assets folder path for current project
    /// </summary>
    public string GetAssetsPath()
    {
        if (_currentProject == null || string.IsNullOrEmpty(_currentProjectPath))
            return "";

        var projectDirectory = Path.GetDirectoryName(_currentProjectPath);
        if (string.IsNullOrEmpty(projectDirectory))
            return "";

        return Path.Combine(projectDirectory, _currentProject.Assets.AssetsFolderPath);
    }

    /// <summary>
    /// Check if current project has unsaved changes
    /// </summary>
    public bool HasUnsavedChanges()
    {
        if (_currentProject == null || string.IsNullOrEmpty(_currentProjectPath))
            return false;

        if (!File.Exists(_currentProjectPath))
            return true;

        var fileLastModified = File.GetLastWriteTime(_currentProjectPath);
        return _currentProject.LastModified > fileLastModified.AddSeconds(1); // 1 second tolerance
    }
}
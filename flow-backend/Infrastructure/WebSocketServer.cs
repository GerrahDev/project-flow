using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Flow.Backend.Core.Services;
using Flow.Backend.Core.Models;

namespace Flow.Backend.Infrastructure;

public class WebSocketServer
{
    private readonly ILogger<WebSocketServer> _logger;
    private readonly ProjectService _projectService;
    private HttpListener? _httpListener;
    private bool _isRunning;

    public WebSocketServer(ILogger<WebSocketServer> logger, ProjectService projectService)
    {
        _logger = logger;
        _projectService = projectService;
        
        // Subscribe to project events
        _projectService.ProjectLoaded += OnProjectLoaded;
        _projectService.ProjectClosed += OnProjectClosed;
        _projectService.ProjectUpdated += OnProjectUpdated;
    }

    public async Task StartAsync(string url = "http://localhost:8080/")
    {
        _httpListener = new HttpListener();
        _httpListener.Prefixes.Add(url);
        _httpListener.Start();
        _isRunning = true;

        _logger.LogInformation("🚀 WebSocket server running on ws://localhost:8080/flow");
        _logger.LogInformation("📡 Waiting for frontend connection...");

        while (_isRunning)
        {
            try
            {
                var context = await _httpListener.GetContextAsync();

                if (context.Request.IsWebSocketRequest)
                {
                    var webSocketContext = await context.AcceptWebSocketAsync(subProtocol: null);
                    var webSocket = webSocketContext.WebSocket;

                    _logger.LogInformation("✅ Frontend connected successfully!");

                    // Handle the connection
                    _ = Task.Run(() => HandleWebSocketConnectionAsync(webSocket));
                }
                else
                {
                    // Reject non-WebSocket requests
                    context.Response.StatusCode = 400;
                    context.Response.Close();
                }
            }
            catch (Exception ex) when (_isRunning)
            {
                _logger.LogError(ex, "❌ Error accepting WebSocket connection");
            }
        }
    }

    public void Stop()
    {
        _isRunning = false;
        _httpListener?.Stop();
        _httpListener?.Close();
        _logger.LogInformation("WebSocket server stopped");
    }

    private async Task HandleWebSocketConnectionAsync(WebSocket webSocket)
    {
        var buffer = new byte[1024 * 4];

        try
        {
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var messageJson = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessCommandAsync(webSocket, messageJson);
                }
                else if (result.MessageType == WebSocketMessageType.Close)
                {
                    _logger.LogInformation("🔌 Frontend disconnected");
                    break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ WebSocket connection error");
        }
        finally
        {
            if (webSocket.State == WebSocketState.Open)
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "", CancellationToken.None);
            }
        }
    }

    private async Task ProcessCommandAsync(WebSocket webSocket, string messageJson)
    {
        try
        {
            _logger.LogInformation("📨 Received: {Message}", messageJson);

            var command = JsonSerializer.Deserialize<WebSocketCommand>(messageJson, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            if (command == null)
            {
                await SendErrorAsync(webSocket, "Invalid command format");
                return;
            }

            var response = await HandleCommandAsync(command);
            await SendResponseAsync(webSocket, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error processing command");
            await SendErrorAsync(webSocket, $"Command processing failed: {ex.Message}");
        }
    }

    private async Task<WebSocketResponse> HandleCommandAsync(WebSocketCommand command)
    {
        try
        {
            return command.Type switch
            {
                // Connection testing
                "ping" => HandlePing(command),
                
                // Project management
                "createProject" => await HandleCreateProjectAsync(command),
                "updateProjectSettings" => await HandleUpdateProjectSettingsAsync(command),
                "saveProject" => await HandleSaveProjectAsync(command),
                "loadProject" => await HandleLoadProjectAsync(command),
                "closeProject" => await HandleCloseProjectAsync(command),
                "getProjectInfo" => HandleGetProjectInfo(command),
                
                // Asset management (future)
                "getAssetsPath" => HandleGetAssetsPath(command),
                
                _ => new WebSocketResponse
                {
                    Type = "error",
                    Success = false,
                    Message = $"Unknown command: {command.Type}"
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Command handler error: {CommandType}", command.Type);
            return new WebSocketResponse
            {
                Type = "error",
                Success = false,
                Message = ex.Message
            };
        }
    }

    // Command Handlers

    private WebSocketResponse HandlePing(WebSocketCommand command)
    {
        return new WebSocketResponse
        {
            Type = "pong",
            Success = true,
            Data = new { timestamp = DateTime.Now, received = command.Data }
        };
    }

    private async Task<WebSocketResponse> HandleCreateProjectAsync(WebSocketCommand command)
    {
        var data = command.Data?.ToString();
        var options = JsonSerializer.Deserialize<CreateProjectOptions>(data ?? "{}", new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var project = await _projectService.CreateProjectAsync(
            options?.Name ?? "Untitled Project",
            options?.FilePath
        );

        return new WebSocketResponse
        {
            Type = "projectCreated",
            Success = true,
            Message = $"Project '{project.Name}' created successfully",
            Data = _projectService.GetProjectInfo()
        };
    }

    private async Task<WebSocketResponse> HandleUpdateProjectSettingsAsync(WebSocketCommand command)
    {
        var data = command.Data?.ToString();
        var settings = JsonSerializer.Deserialize<UpdateSettingsOptions>(data ?? "{}", new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        ProjectCanvas? canvas = null;
        ProjectTimeline? timeline = null;

        if (settings?.Canvas != null)
        {
            canvas = new ProjectCanvas
            {
                Width = settings.Canvas.Width ?? 1920,
                Height = settings.Canvas.Height ?? 1080,
                BackgroundColor = settings.Canvas.BackgroundColor ?? "#000000",
                FrameRate = settings.Canvas.FrameRate ?? 30.0
            };
        }

        if (settings?.Timeline != null)
        {
            timeline = new ProjectTimeline
            {
                Duration = settings.Timeline.Duration != null 
                    ? TimeSpan.Parse(settings.Timeline.Duration) 
                    : TimeSpan.FromSeconds(10),
                CurrentTime = settings.Timeline.CurrentTime != null
                    ? TimeSpan.Parse(settings.Timeline.CurrentTime)
                    : TimeSpan.Zero,
                Zoom = settings.Timeline.Zoom ?? 1.0,
                IsPlaying = settings.Timeline.IsPlaying ?? false
            };
        }

        var project = await _projectService.UpdateProjectSettingsAsync(
            settings?.Name,
            canvas,
            timeline
        );

        return new WebSocketResponse
        {
            Type = "projectUpdated",
            Success = true,
            Message = "Project settings updated successfully",
            Data = _projectService.GetProjectInfo()
        };
    }

    private async Task<WebSocketResponse> HandleSaveProjectAsync(WebSocketCommand command)
    {
        var data = command.Data?.ToString();
        var options = JsonSerializer.Deserialize<SaveProjectOptions>(data ?? "{}", new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var filePath = await _projectService.SaveProjectAsync(options?.FilePath);

        return new WebSocketResponse
        {
            Type = "projectSaved",
            Success = true,
            Message = $"Project saved to {Path.GetFileName(filePath)}",
            Data = new { filePath = filePath, projectInfo = _projectService.GetProjectInfo() }
        };
    }

    private async Task<WebSocketResponse> HandleLoadProjectAsync(WebSocketCommand command)
    {
        var data = command.Data?.ToString();
        var options = JsonSerializer.Deserialize<LoadProjectOptions>(data ?? "{}", new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        if (string.IsNullOrEmpty(options?.FilePath))
        {
            throw new ArgumentException("File path is required for loading project");
        }

        var project = await _projectService.LoadProjectAsync(options.FilePath);

        return new WebSocketResponse
        {
            Type = "projectLoaded",
            Success = true,
            Message = $"Project '{project.Name}' loaded successfully",
            Data = _projectService.GetProjectInfo()
        };
    }

    private async Task<WebSocketResponse> HandleCloseProjectAsync(WebSocketCommand command)
    {
        await _projectService.CloseProjectAsync();

        return new WebSocketResponse
        {
            Type = "projectClosed",
            Success = true,
            Message = "Project closed successfully",
            Data = _projectService.GetProjectInfo()
        };
    }

    private WebSocketResponse HandleGetProjectInfo(WebSocketCommand command)
    {
        return new WebSocketResponse
        {
            Type = "projectInfo",
            Success = true,
            Data = _projectService.GetProjectInfo()
        };
    }

    private WebSocketResponse HandleGetAssetsPath(WebSocketCommand command)
    {
        var assetsPath = _projectService.GetAssetsPath();
        
        return new WebSocketResponse
        {
            Type = "assetsPath",
            Success = true,
            Data = new { 
                assetsPath = assetsPath,
                exists = Directory.Exists(assetsPath),
                hasProject = _projectService.HasProject
            }
        };
    }

    // Event Handlers

    private async void OnProjectLoaded(FlowProject project)
    {
        // Broadcast to all connected clients (if multiple)
        _logger.LogInformation("Project loaded event: {ProjectName}", project.Name);
    }

    private async void OnProjectClosed()
    {
        _logger.LogInformation("Project closed event");
    }

    private async void OnProjectUpdated(FlowProject project)
    {
        _logger.LogInformation("Project updated event: {ProjectName}", project.Name);
    }

    // Helper Methods

    private async Task SendResponseAsync(WebSocket webSocket, WebSocketResponse response)
    {
        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var responseBytes = Encoding.UTF8.GetBytes(jsonResponse);
        await webSocket.SendAsync(
            new ArraySegment<byte>(responseBytes),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None
        );

        _logger.LogInformation("📤 Sent: {Response}", response.Type);
    }

    private async Task SendErrorAsync(WebSocket webSocket, string errorMessage)
    {
        var errorResponse = new WebSocketResponse
        {
            Type = "error",
            Success = false,
            Message = errorMessage
        };

        await SendResponseAsync(webSocket, errorResponse);
    }
}

// WebSocket Message Classes

public class WebSocketCommand
{
    public string Type { get; set; } = "";
    public object? Data { get; set; }
    public long Timestamp { get; set; }
}

public class WebSocketResponse
{
    public string Type { get; set; } = "";
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public object? Data { get; set; }
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

// Command Options Classes

public class CreateProjectOptions
{
    public string? Name { get; set; }
    public string? FilePath { get; set; }
}

public class UpdateSettingsOptions
{
    public string? Name { get; set; }
    public CanvasOptions? Canvas { get; set; }
    public TimelineOptions? Timeline { get; set; }
}

public class CanvasOptions
{
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string? BackgroundColor { get; set; }
    public double? FrameRate { get; set; }
}

public class TimelineOptions
{
    public string? Duration { get; set; }
    public string? CurrentTime { get; set; }
    public double? Zoom { get; set; }
    public bool? IsPlaying { get; set; }
}

public class SaveProjectOptions
{
    public string? FilePath { get; set; }
}

public class LoadProjectOptions
{
    public string? FilePath { get; set; }
}
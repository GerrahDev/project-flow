using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Flow.Backend.Core.Services;
using Flow.Backend.Infrastructure;

namespace Flow.Backend;

class Program
{
    static async Task Main(string[] args)
    {
        // Create host builder with dependency injection
        var builder = Host.CreateApplicationBuilder(args);

        // Configure logging
        builder.Logging.ClearProviders();
        builder.Logging.AddConsole();
        builder.Logging.SetMinimumLevel(LogLevel.Information);

        // Register services
        builder.Services.AddSingleton<ProjectService>();
        builder.Services.AddSingleton<WebSocketServer>();

        // Build the host
        var host = builder.Build();
        var logger = host.Services.GetRequiredService<ILogger<Program>>();

        logger.LogInformation("🚀 Flow Backend starting...");

        try
        {
            // Get services
            var projectService = host.Services.GetRequiredService<ProjectService>();
            var webSocketServer = host.Services.GetRequiredService<WebSocketServer>();

            // Start WebSocket server
            logger.LogInformation("Starting WebSocket server...");
            
            // Start server in background task
            var serverTask = Task.Run(async () =>
            {
                try
                {
                    await webSocketServer.StartAsync("http://localhost:8080/");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "❌ WebSocket server failed");
                }
            });

            logger.LogInformation("✅ Flow Backend started successfully");
            logger.LogInformation("📡 WebSocket server: ws://localhost:8080/flow");
            logger.LogInformation("🎯 Ready for frontend connections");
            logger.LogInformation("Press Ctrl+C to stop...");

            // Handle graceful shutdown
            var cancellationTokenSource = new CancellationTokenSource();
            
            Console.CancelKeyPress += (sender, e) =>
            {
                e.Cancel = true;
                logger.LogInformation("🛑 Shutdown requested...");
                cancellationTokenSource.Cancel();
            };

            // Wait for cancellation
            try
            {
                await Task.Delay(-1, cancellationTokenSource.Token);
            }
            catch (OperationCanceledException)
            {
                // Expected when shutdown is requested
            }

            // Graceful shutdown
            logger.LogInformation("🔄 Shutting down services...");
            webSocketServer.Stop();
            
            // Wait a bit for cleanup
            await Task.Delay(1000);
            
            logger.LogInformation("✅ Flow Backend stopped");

        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "❌ Fatal error during startup");
            Environment.Exit(1);
        }
    }
}
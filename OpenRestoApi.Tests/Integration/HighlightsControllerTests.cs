using System.Net;
using System.Net.Http.Json;
using OpenRestoApi.Core.Application.DTOs;

namespace OpenRestoApi.Tests.Integration;

public class HighlightsControllerTests(TestWebAppFactory factory) : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory = factory;

    [Fact]
    public async Task GetAll_ReturnsOk()
    {
        HttpClient client = _factory.CreateClient();
        HttpResponseMessage response = await client.GetAsync("/api/highlights");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithoutAuth_Returns401()
    {
        HttpClient client = _factory.CreateClient();
        HttpResponseMessage response = await client.PostAsJsonAsync("/api/highlights", new
        {
            title = "Test",
            body = "Body",
            iconKey = "star",
            sortOrder = 0
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithAuth_Returns201WithDto()
    {
        HttpClient client = _factory.CreateAuthenticatedClient();
        HttpResponseMessage response = await client.PostAsJsonAsync("/api/highlights", new
        {
            title = "Integration Test Highlight",
            body = "Some body text",
            iconKey = "star",
            sortOrder = 0
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        HighlightDto? dto = await response.Content.ReadFromJsonAsync<HighlightDto>();
        Assert.NotNull(dto);
        Assert.NotEqual(0, dto.Id);
        Assert.Equal("Integration Test Highlight", dto.Title);
    }

    [Fact]
    public async Task Update_WithoutAuth_Returns401()
    {
        HttpClient client = _factory.CreateClient();
        HttpResponseMessage response = await client.PutAsJsonAsync("/api/highlights/1", new
        {
            title = "X",
            body = "y",
            iconKey = "star",
            sortOrder = 0
        });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Update_ExistingHighlight_Returns200()
    {
        HttpClient client = _factory.CreateAuthenticatedClient();
        // Create first
        HttpResponseMessage createResp = await client.PostAsJsonAsync("/api/highlights", new
        {
            title = "Original",
            body = "body",
            iconKey = "star",
            sortOrder = 0
        });
        HighlightDto? created = await createResp.Content.ReadFromJsonAsync<HighlightDto>();
        Assert.NotNull(created);

        HttpResponseMessage updateResp = await client.PutAsJsonAsync($"/api/highlights/{created.Id}", new
        {
            title = "Updated",
            body = "updated body",
            iconKey = "flame",
            sortOrder = 1
        });
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        HighlightDto? updated = await updateResp.Content.ReadFromJsonAsync<HighlightDto>();
        Assert.Equal("Updated", updated?.Title);
        Assert.Equal("flame", updated?.IconKey);
    }

    [Fact]
    public async Task Update_NonExistingHighlight_Returns404()
    {
        HttpClient client = _factory.CreateAuthenticatedClient();
        HttpResponseMessage response = await client.PutAsJsonAsync("/api/highlights/99999", new
        {
            title = "X",
            body = "y",
            iconKey = "star",
            sortOrder = 0
        });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WithoutAuth_Returns401()
    {
        HttpClient client = _factory.CreateClient();
        HttpResponseMessage response = await client.DeleteAsync("/api/highlights/1");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Delete_ExistingHighlight_Returns204()
    {
        HttpClient client = _factory.CreateAuthenticatedClient();
        // Create first
        HttpResponseMessage createResp = await client.PostAsJsonAsync("/api/highlights", new
        {
            title = "ToDelete",
            body = "body",
            iconKey = "star",
            sortOrder = 0
        });
        HighlightDto? created = await createResp.Content.ReadFromJsonAsync<HighlightDto>();
        Assert.NotNull(created);

        HttpResponseMessage deleteResp = await client.DeleteAsync($"/api/highlights/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);
    }

    [Fact]
    public async Task Delete_NonExistingHighlight_Returns404()
    {
        HttpClient client = _factory.CreateAuthenticatedClient();
        HttpResponseMessage response = await client.DeleteAsync("/api/highlights/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

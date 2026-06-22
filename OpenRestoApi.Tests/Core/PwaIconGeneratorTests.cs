using OpenRestoApi.Core.Application;

namespace OpenRestoApi.Tests.Core;

public class PwaIconGeneratorTests
{
    [Theory]
    [InlineData(192)]
    [InlineData(512)]
    public void Generate_ReturnsNonEmptyByteArray(int size)
    {
        string svgInner = LucideIconPaths.Get("utensils")!;
        byte[] result = PwaIconGenerator.Generate(size, "#0a7ea4", svgInner);
        Assert.NotEmpty(result);
    }

    [Theory]
    [InlineData(192)]
    [InlineData(512)]
    public void Generate_ReturnsPngMagicBytes(int size)
    {
        string svgInner = LucideIconPaths.Get("star")!;
        byte[] result = PwaIconGenerator.Generate(size, "#ff5500", svgInner);

        // PNG signature: 0x89 P N G 0x0D 0x0A 0x1A 0x0A
        Assert.True(result.Length >= 8);
        Assert.Equal(0x89, result[0]);
        Assert.Equal(0x50, result[1]); // P
        Assert.Equal(0x4E, result[2]); // N
        Assert.Equal(0x47, result[3]); // G
    }

    [Fact]
    public void Generate_DifferentSizeProducesDifferentOutput()
    {
        string svgInner = LucideIconPaths.Get("heart")!;
        byte[] small = PwaIconGenerator.Generate(192, "#123456", svgInner);
        byte[] large = PwaIconGenerator.Generate(512, "#123456", svgInner);

        Assert.NotEqual(small.Length, large.Length);
    }
}

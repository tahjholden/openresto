using System.Text;
using ImageMagick;

namespace OpenRestoApi.Core.Application;

public static class PwaIconGenerator
{
    public static byte[] Generate(int size, string hexColor, string svgInner)
    {
        float scale = size * 0.6f / 24f;
        float offset = size * 0.2f;
        int cornerRadius = (int)(size * 0.22f);

        string svg = $"""
            <svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}">
              <rect width="{size}" height="{size}" rx="{cornerRadius}" ry="{cornerRadius}" fill="{hexColor}"/>
              <g transform="translate({offset},{offset}) scale({scale})"
                 stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
                {svgInner}
              </g>
            </svg>
            """;

        var settings = new MagickReadSettings
        {
            Format = MagickFormat.Svg,
            Width = (uint)size,
            Height = (uint)size,
            BackgroundColor = MagickColors.Transparent,
        };

        using var image = new MagickImage(Encoding.UTF8.GetBytes(svg), settings);
        image.Format = MagickFormat.Png;
        return image.ToByteArray();
    }
}

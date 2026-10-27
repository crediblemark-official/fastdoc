from PIL import Image, ImageDraw, ImageFont
import os

def create_fastdoc_icon():
    size = 256
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background rounded rectangle with gradient-like effect
    # Dark blue/indigo to purple gradient simulation
    radius = 56
    padding = 8
    
    # Draw smooth rounded squircle
    for i in range(size - 2 * padding):
        y = padding + i
        # interpolate color from #4f46e5 (79, 70, 229) to #7c3aed (124, 58, 237)
        ratio = i / (size - 2 * padding)
        r = int(79 + (124 - 79) * ratio)
        g = int(70 + (58 - 70) * ratio)
        b = int(229 + (237 - 229) * ratio)
        draw.line([(padding, y), (size - padding, y)], fill=(r, g, b, 255))
    
    # Create mask for rounded corners
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([padding, padding, size - padding, size - padding], radius=radius, fill=255)
    
    # Apply mask to gradient
    final_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_img.paste(img, (0, 0), mask)
    draw = ImageDraw.Draw(final_img)

    # Inner subtle glow border
    draw.rounded_rectangle([padding, padding, size - padding, size - padding], radius=radius, outline=(255, 255, 255, 60), width=3)

    # 2. Document Shape (white with folded top-right corner)
    doc_left = 68
    doc_top = 48
    doc_right = 188
    doc_bottom = 208
    fold_size = 34

    # Document body polygon
    doc_points = [
        (doc_left, doc_top),
        (doc_right - fold_size, doc_top),
        (doc_right, doc_top + fold_size),
        (doc_right, doc_bottom),
        (doc_left, doc_bottom),
    ]
    draw.polygon(doc_points, fill=(255, 255, 255, 245))

    # Folded corner
    fold_points = [
        (doc_right - fold_size, doc_top),
        (doc_right - fold_size, doc_top + fold_size),
        (doc_right, doc_top + fold_size),
    ]
    draw.polygon(fold_points, fill=(210, 220, 250, 255))
    draw.line([(doc_right - fold_size, doc_top), (doc_right - fold_size, doc_top + fold_size), (doc_right, doc_top + fold_size)], fill=(180, 190, 230, 255), width=2)

    # 3. Document text lines
    draw.rounded_rectangle([doc_left + 18, doc_top + 28, doc_left + 65, doc_top + 36], radius=4, fill=(99, 102, 241, 200))
    draw.rounded_rectangle([doc_left + 18, doc_top + 50, doc_right - 18, doc_top + 58], radius=4, fill=(203, 213, 225, 230))
    draw.rounded_rectangle([doc_left + 18, doc_top + 70, doc_right - 28, doc_top + 78], radius=4, fill=(203, 213, 225, 230))
    draw.rounded_rectangle([doc_left + 18, doc_top + 90, doc_right - 40, doc_top + 98], radius=4, fill=(203, 213, 225, 230))

    # 4. Lightning bolt / Fast badge (bottom-right of doc)
    bolt_points = [
        (140, 100),
        (108, 148),
        (134, 148),
        (116, 204),
        (172, 136),
        (144, 136),
        (160, 100),
    ]
    # Draw drop shadow for bolt
    shadow_points = [(x + 2, y + 3) for x, y in bolt_points]
    draw.polygon(shadow_points, fill=(0, 0, 0, 70))
    # Bolt fill: vibrant amber/yellow
    draw.polygon(bolt_points, fill=(251, 191, 36, 255))
    # Bolt border
    draw.polygon(bolt_points, outline=(245, 158, 11, 255))

    # Save to packaging/icon.ico with multiple sizes
    out_path = os.path.join(os.path.dirname(__file__), "..", "packaging", "icon.ico")
    icon_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    final_img.save(out_path, format="ICO", sizes=icon_sizes)
    print(f"Generated {out_path} with sizes {icon_sizes}")

if __name__ == "__main__":
    create_fastdoc_icon()

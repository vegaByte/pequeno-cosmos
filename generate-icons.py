"""Generate the app's original pixel icon using only Python's standard library."""
import pathlib
import struct
import zlib

SPRITE = ['001000100', '000101000', '001111100', '011111110',
          '110101011', '111111111', '101000101', '001101100']


def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))


for size in (180, 192, 512):
    data = bytearray()
    unit = size / 17
    for y in range(size):
        data.append(0)
        for x in range(size):
            sx, sy = int(x / unit) - 4, int(y / unit) - 4
            color = (11, 17, 32)
            if 0 <= sx < 9 and 0 <= sy < 8 and SPRITE[sy][sx] == '1':
                color = (112, 217, 202)
            if (2 <= x / unit < 3 and 3 <= y / unit < 4) or (13 <= x / unit < 14 and 13 <= y / unit < 14):
                color = (243, 217, 135)
            data.extend(color)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(data)) + chunk(b'IEND', b'')
    (pathlib.Path(__file__).parent / 'docs' / f'icon-{size}.png').write_bytes(png)

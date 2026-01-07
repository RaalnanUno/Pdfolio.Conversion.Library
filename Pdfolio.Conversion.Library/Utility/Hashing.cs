using System.Security.Cryptography;

namespace Pdfolio.Conversion.Utility;

public static class Hashing
{
    public static string Sha256Hex(byte[] bytes)
        => Convert.ToHexString(SHA256.HashData(bytes))
            .ToLowerInvariant();
}

/**
 * v3 API timestamps are integer epochs. Handle both seconds and
 * milliseconds defensively (values above ~2001-09-09 in ms are > 1e12).
 */
export const epochToDate = (epoch: number): Date =>
  new Date(epoch > 1e12 ? epoch : epoch * 1000);

// theme/styles.ts
import { StyleSheet } from "react-native";
import { COLORS } from "./colors";

export const otherstyles = StyleSheet.create({
    // =========================
  // Network Error State
  // =========================
  netErrWrap: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  netErrWrapCompact: {
    paddingVertical: 16,
    justifyContent: "center",
  },
  netErrIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  netErrIcon: {
    fontSize: 26,
  },
  netErrTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  netErrMessage: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  netErrBtn: {
    marginTop: 14,
    width: "100%",
    maxWidth: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  netErrBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  netErrBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
  },
  netErrHint: {
    marginTop: 12,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 18,
  },

  
});

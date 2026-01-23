import { Platform, StyleSheet,Dimensions } from "react-native";
import { COLORS } from "./colors";

const { width: W, height: H } = Dimensions.get("window");

export const styles = StyleSheet.create({



slide: {
    flex: 1,
  },

  // language pill
  langPill: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  langText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E1E1E",
  },
  langArrow: {
    marginLeft: 8,
    fontWeight: "500",
    color: "#1E1E1E",
  },

  // text
  textWrap: {
    paddingTop: Platform.OS === "ios" ? 120 : 100,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "500",
    color: "#1E1E1E",
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "#3B3B3B",
  },

  // image
  imageWrap: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 14,
  },
  hero: {
    width: W,
    height: Math.min(H * 0.46, 420), // keeps it big but not crazy
  },

  // bottom
  bottomWrap: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: "#111",
    transform: [{ scale: 1.05 }],
  },
  dotInactive: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  primaryBtn: {
    width: "100%",
    height: 50,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: "#3c3b3bff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  loginText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "500",
    color: "#1E1E1E",
  },

  tabBar: {
    height: 74,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopColor: COLORS.line,
  },
  tabLabel: { fontSize: 12, fontWeight: "700" },
  tabIconDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconText: { fontSize: 16, color: "#A3A3A3", fontWeight: "500" },

  bigTitle: { fontSize: 24, fontWeight: "600", marginTop: 10, color: COLORS.text ,  marginBottom: 10},

  muted: { color: COLORS.muted, fontWeight: "600",  },

  topBar: { paddingHorizontal: 16, paddingTop: 10, flexDirection: "row", alignItems: "center" },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  getGiftPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDEAE7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  getGiftText: { marginLeft: 8, fontWeight: "800", color: COLORS.greenDark },

  sectionRow: { marginTop: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  hideBalanceRow: { flexDirection: "row", alignItems: "center" },
  hideBalanceText: { color: COLORS.muted, fontWeight: "700" },

  accountsRow: { paddingHorizontal: 12, flexDirection: "row", gap: 0, marginTop: 12 },
  accountCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, paddingHorizontal: 26,paddingVertical: 18
  },
  accountHeader: { flexDirection: "row", alignItems: "center" },
  flag: { fontSize: 18, marginRight: 10 },
  accountLabel: { fontWeight: "800", color: "#3B3B3B" },
  accountAmount: { marginTop: 18, fontSize: 26, fontWeight: "600", color: COLORS.text },

  actionsRow: { paddingHorizontal: 16, flexDirection: "row", alignItems: "center", marginTop: 14 },

  outlineBtn: {
    width: "100%",
    borderWidth: 2,
    borderColor: COLORS.green,
    paddingVertical: 10,
    marginBottom: -20,
    height: 50,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  outlineBtnText: { color: COLORS.green, fontWeight: "600", fontSize: 16 },

  moreCircle: {
    marginLeft: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.green,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  recentRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 12, marginBottom: 15 },
  recentCard: {
    width: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  recentAvatarWrap: { position: "relative", width: 44, height: 44 },
  recentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e9e9e9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  smallFlag: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  recentName: { marginTop: 8, fontWeight: "500" },
  recentBank: { marginTop: 2, color: COLORS.muted, fontWeight: "700", fontSize: 12 },

  servicesRow: { flexDirection: "row", gap: 18, paddingHorizontal: 16, marginTop: 12 },
  serviceItem: { alignItems: "center", width: 90 },
  serviceIcon: { width: 62, height: 62, borderRadius: 31, justifyContent: "center", alignItems: "center" },
  serviceText: { marginTop: 8, fontWeight: "600", textAlign: "center" },

  // Bottom sheet
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheetContainer: { position: "relative", left: 0, right: 0, bottom: 0 },
  sheet: {  borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 24 },
  sheetClose: {
    position: "absolute",
    left: 14,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    
  },
  sheetTitle: { textAlign: "center", fontWeight: "600", fontSize: 18, marginBottom: 10, marginTop: 15 },
  sheetRow: {
    width: "100%",
    backgroundColor: "#ffffffff",
    borderColor: "transparent",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 9,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    textAlign: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  sheetContent: {
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 18,
},
  sheetRowLeft: { flexDirection: "row", alignItems: "center" },
  sheetRowTitle: { fontWeight: "500" },
  sheetRowSub: { color: COLORS.muted, fontWeight: "700" },
  sheetRowAmt: { fontWeight: "600", color: "#333" },

  // Send/Convert UI
  noticePill: { backgroundColor: "#EFEDEB", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8 },
  sendCard: { backgroundColor: "#fff", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line, marginTop: 12 },
  fieldLabel: { color: COLORS.muted, fontWeight: "500" },
  amountRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  amountInput: { flex: 1, fontSize: 34, fontWeight: "600", color: "#1E1E1E", paddingVertical: 6 },
  currencyPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#D7D2CD",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginLeft: 10,
  },
  ratePill: { alignSelf: "flex-end", backgroundColor: COLORS.greenSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginTop: 10 },
  payWithCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  changeBtn: { backgroundColor: COLORS.green, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },

  disabledBigBtn: { height: 58, borderRadius: 999, backgroundColor: "#DCDCDC", justifyContent: "center", alignItems: "center", marginTop: 16 },
  disabledContinue: { height: 58, borderRadius: 999, backgroundColor: "#E0E0E0", justifyContent: "center", alignItems: "center" },
  bottomHint: { textAlign: "center", color: COLORS.muted, fontWeight: "700", marginTop: 10 },

  // Transactions list
  groupDate: { fontWeight: "600", color: "#2D2D2D" },
  groupLine: { height: 1, backgroundColor: COLORS.line, marginTop: 10 },
  txRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  txLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F0F0F0", justifyContent: "center", alignItems: "center" },
  txTitle: { fontWeight: "500" },
  txTime: { color: COLORS.muted, fontWeight: "700", marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmt: { fontWeight: "500" },
  txSubAmt: { marginTop: 2, color: COLORS.muted, fontWeight: "700" },

  // Simple pills
  filtersRow: { flexDirection: "row", gap: 10, marginTop: 4,padding: 12 },
  filterPill: { backgroundColor: "#EDEAE7", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  filterPillActive: { backgroundColor: "#1E1E1E" },
  filterText: { fontWeight: "600", color: "#4B4B4B" },
  filterTextActive: { color: "#fff" },

  // Convert blocks
  convertHint: { color: COLORS.muted, fontWeight: "700", marginTop: 6 },
  convertBox: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.line, marginTop: 14 },
  convertRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  convertBalance: { marginTop: 8, color: COLORS.muted, fontWeight: "700" },
  convertMid: { alignItems: "flex-start", marginTop: 12, marginLeft: 12, gap: 8 },

  feesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },

  // Get started
  getHelpPillWrap: { alignItems: "flex-end" },
  getHelpPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#EFEDEB" },
  phoneRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  countryBox: {
    width: 70,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneInputBox: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  signInRow: { textAlign: "center", marginTop: 18, color: "#4B4B4B", fontWeight: "700" },
  checkRow: { flexDirection: "row", marginTop: 14 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.line,
    marginRight: 12,
    marginTop: 2,
    backgroundColor: "#fff",
  },
  checkText: { flex: 1, color: "#4B4B4B", fontWeight: "600", lineHeight: 20 },
  link: { color: COLORS.green, fontWeight: "500" },

  // CAD wallet top
  centerHeader: { alignItems: "center" },
  flagBig: { fontSize: 22, marginTop: 6 },
  walletTitle: { marginTop: 8, fontWeight: "800", color: "#3B3B3B" },
  walletAmount: { marginTop: 10, fontSize: 34, fontWeight: "500" },
  limitsPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFEDEB", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, marginTop: 12 },
  walletActionRow: { flexDirection: "row", gap: 18, marginTop: 16 },
  walletActionCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.green, justifyContent: "center", alignItems: "center" },

  pillTabs: { flexDirection: "row", backgroundColor: "#EAE6E3", borderRadius: 999, padding: 4, marginTop: 16, width: "100%" },
  pillTab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  pillTabActive: { backgroundColor: "#fff" },
  pillTabText: { fontWeight: "600", color: "#6D6D6D" },
  pillTabTextActive: { color: "#2A2A2A" },

  detailsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.line, marginTop: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  detailKey: { color: COLORS.muted, fontWeight: "800" },
  detailVal: { fontWeight: "500" },

  // Methods
  methodCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.line, marginTop: 12 },
  methodIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#FFD56A", justifyContent: "center", alignItems: "center" },
  methodTitle: { fontWeight: "600", fontSize: 16, marginBottom: 3 },

    // ===== Send flow headers =====
  flowHeader: {
    paddingTop: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFEDEB",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnText: { fontWeight: "600", color: "#2A2A2A", fontSize: 16 },
  flowHeaderTitle: { fontWeight: "600", color: "#2A2A2A", fontSize: 16 },

  // ===== Recipients screen =====
  searchBox: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2DDD8",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  newRecipientRow: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2DDD8",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EFEDEB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  newRecipientText: { fontWeight: "600", fontSize: 16 },
  blockTitle: { marginTop: 18, fontWeight: "600", color: "#2A2A2A", fontSize: 16 },

  recentBubblesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  recentBubble: { width: 78, alignItems: "center" },
  recentBubbleAvatarWrap: { position: "relative", width: 56, height: 56 },
  recentBubbleAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3D1F54",
    justifyContent: "center",
    alignItems: "center",
  },
  recentBubbleName: { marginTop: 8, fontWeight: "600", maxWidth: 78 },
  recentBubbleBank: { marginTop: 2, color: "#6F6F6F", fontWeight: "700", fontSize: 12, maxWidth: 78 },

  segmentRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  segmentPill: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "#EDEAE7" },
  segmentPillActive: { backgroundColor: "#1E1E1E" },
  segmentText: { fontWeight: "600", color: "#4B4B4B" },
  segmentTextActive: { color: "#fff" },

  recipientRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2DDD8",
    padding: 14,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recipientLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  recipientAvatarWrap: { width: 44, height: 44, position: "relative" },
  recipientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2B2B6D",
    justifyContent: "center",
    alignItems: "center",
  },
  recipientName: { fontWeight: "500" },
  recipientMeta: { marginTop: 2, color: "#6F6F6F", fontWeight: "700", fontSize: 12 },
  chev: { fontSize: 18, color: "#9B9B9B", fontWeight: "500" },

  // ===== Recipient details =====
  inputLabel: { fontWeight: "600", color: "#6F6F6F" },
  dropdown: {
    marginTop: 10,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2DDD8",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: { fontWeight: "600", color: "#2A2A2A" },
  dropdownArrow: { fontWeight: "600", color: "#2A2A2A" },
  textField: {
    marginTop: 10,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2DDD8",
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  textFieldInput: { fontWeight: "600", fontSize: 16, color: "#2A2A2A" },

  toggleRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  toggle: { width: 42, height: 24, borderRadius: 999, padding: 2, justifyContent: "center" },
  toggleOn: { backgroundColor: "#2E9E6A" },
  toggleOff: { backgroundColor: "#D0D0D0" },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  toggleText: { marginLeft: 12, fontWeight: "800", color: "#6F6F6F" },

  bigBottomBtn: {
    height: 58,
    borderRadius: 999,
    backgroundColor: "#2E9E6A",
    justifyContent: "center",
    alignItems: "center",
  },
  bigBottomBtnText: { color: "#fff", fontWeight: "600", fontSize: 18 },

  // confirm bottom sheet
  confirmAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#3A240A",
    justifyContent: "center",
    alignItems: "center",
  },
  verifyBadge: {
    position: "absolute",
    top: 74,
    right: "38%",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2E9E6A",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  confirmTitle: { marginTop: 18, fontWeight: "600", fontSize: 18 },
  confirmCard: {
    width: "100%",
    backgroundColor: "#F6F6F6",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    alignItems: "center",
  },
  confirmName: { fontWeight: "600", fontSize: 16 },
  confirmMeta: { marginTop: 6, color: "#6F6F6F", fontWeight: "700" },
  confirmHint: { marginTop: 14, color: "#6F6F6F", fontWeight: "700", textAlign: "center" },

  // ===== Review details =====
  reviewTopIcons: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 6 },
  reviewFlagCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2DDD8",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#3A240A",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewSmall: { textAlign: "center", marginTop: 14, color: "#6F6F6F", fontWeight: "800" },
  reviewBig: { textAlign: "center", marginTop: 8, fontSize: 34, fontWeight: "500" },
  reviewTo: { textAlign: "center", marginTop: 6, color: "#6F6F6F", fontWeight: "700" },
  hr: { height: 1, backgroundColor: "#E2DDD8", marginTop: 14 },
  reviewSection: { marginTop: 14, fontWeight: "600", color: "#2A2A2A" },

  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2DDD8",
    padding: 14,
    marginTop: 12,
  },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  reviewKey: { color: "#6F6F6F", fontWeight: "800" },
  reviewVal: { fontWeight: "600", color: "#2A2A2A" },
  reviewDivider: { height: 1, backgroundColor: "#EAEAEA", marginVertical: 10 },
  deliveryPill: { marginTop: 12, backgroundColor: "#DDF3E7", borderRadius: 12, padding: 12, alignItems: "center" },

  // ===== Fraud aware =====
  warnTriangle: { alignSelf: "center", width: 70, height: 70, borderRadius: 18, backgroundColor: "#FFE9A8", justifyContent: "center", alignItems: "center" },
  warnTitle: { textAlign: "center", marginTop: 14, fontSize: 28, fontWeight: "600", color: "#2A2A2A" },
  warnCard: { marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E2DDD8", padding: 14 },
  warnStop: { fontWeight: "600", marginBottom: 8 },
  warnRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  warnX: { color: "#E05858", fontWeight: "600", marginTop: 2 },
  warnText: { flex: 1, color: "#6F6F6F", fontWeight: "700", lineHeight: 20 },
  infoBox: { marginTop: 14, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2DDD8", padding: 14 },

  // ===== PIN =====
  pinHeader: { paddingTop: 10, paddingHorizontal: 12 },
  pinTop: { alignItems: "center", marginTop: 30 },
  pinShield: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2DDD8", justifyContent: "center", alignItems: "center" },
  pinTitle: { marginTop: 14, fontSize: 26, fontWeight: "500" },
  pinDotsRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  pinDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#D8D8D8", borderWidth: 1, borderColor: "#D8D8D8" },

  pinPad: { marginTop: 36, paddingHorizontal: 28 },
  pinRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  pinKey: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#F6F3F0",
    borderWidth: 1,
    borderColor: "#DCD7D2",
    justifyContent: "center",
    alignItems: "center",
  },
  pinKeyText: { fontSize: 22, fontWeight: "600", color: "#2A2A2A" },
  forgotPin: { textAlign: "center", marginTop: 26, color: "#6F6F6F", fontWeight: "800" },
  modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.25)",
  justifyContent: "center",
  alignItems: "center",
},

dropdownSheet: {
  width: "88%",
  maxHeight: "70%",
  backgroundColor: "#fff",
  borderRadius: 18,
  padding: 14,
},

dropdownTitle: {
  fontWeight: "600",
  fontSize: 18,
  marginBottom: 10,
},

sheetDivider: {
  height: 1,
  backgroundColor: "#EFEAE5",
},

countryRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 12,
},

countryName: {
  fontWeight: "600",
  fontSize: 16,
  color: "#2A2A2A",
},

countryDial: {
  marginTop: 2,
  fontWeight: "700",
  color: "#6F6F6F",
  fontSize: 13,
},
accountCardGradient: {
  width: 210,
  height: 140,
  borderRadius: 10,
  padding: 20,
  position: "relative", 
  overflow: "hidden",
},
addAccountSingle: {
  marginRight: 8,
  backgroundColor: COLORS.greenSoft,
  borderRadius: 8,
  padding: 12,
  alignItems: "center",
},
accountLabelWhite: {
  fontWeight: "500",
  color: "#FFFFFF",
  fontSize:20,
},

accountAmountWhite: {
  marginTop: 18,
  fontSize: 26,
  fontWeight: "600",
  color: "#FFFFFF",
},
// fieldLabel: {
//   fontSize: 14,
//   fontWeight: "800",
//   color: "#1E1E1E",
//   marginBottom: 8,
// },

dialCodeText: {
  marginRight: 8,
  fontWeight: "800",
  color: "#1E1E1E",
},

phoneInput: {
  flex: 1,
  fontSize: 16,
  fontWeight: "700",
  color: "#1E1E1E",
},



// passwordBox: {
//   borderWidth: 1,
//   borderColor: "#D9D2CC",
//   backgroundColor: "#fff",
//   borderRadius: 8,
//   height: 56,
//   paddingHorizontal: 14,
//   flexDirection: "row",
//   alignItems: "center",
// },

// passwordInput: {
//   flex: 1,
//   fontSize: 16,
//   fontWeight: "700",
//   color: "#1E1E1E",
// },
secureText: {
  textAlign: "center",
  color: "#9CA3AF",
  fontSize: 12,
  marginTop: 16,
  marginBottom: 32,
},
  infoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  step: {
    flexDirection: "row",
    marginTop: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontWeight: "700",
    color: "#000",
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  emailBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: "center",
  },
  emailText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  copyText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
currencySymbol: {
  fontSize: 24,
  fontWeight: "600",
  color: "#374151",
},
hint:{
  fontSize: 12,
  color: "#6B7280",
  marginTop: 4,
},
eyeBtn: {
  paddingLeft: 10,
  paddingVertical: 10,
},

eyeIcon: {
  fontSize: 18,
  opacity: 0.55,
},

recoverRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 14,
},

recoverLink: {
  color: "#2FB56A",
  fontWeight: "500",
  textDecorationLine: "underline",
},

bigBtn: {
  height: 58,
  borderRadius: 999,
  backgroundColor: "#2FB56A",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 18,
},

bigBtnText: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "500",
},

disabledBigBtnText: {
  color: "#B3B3B3",
  fontWeight: "500",
  fontSize: 18,
},

bottomAuthRow: {
  flexDirection: "row",
  justifyContent: "center",
  marginTop: 18,
  marginBottom: 6,
},

authGreenLink: {
  color: "#2FB56A",
  fontWeight: "500",
},

shell: {
  flex: 1,
  backgroundColor: "#F6F2EE",
  paddingHorizontal: 18,
  paddingTop: 14,
},

topRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 6,
},

backBtn: {
  width: 34,
  height: 34,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
},

backIcon: {
  fontSize: 22,
  fontWeight: "800",
  color: "#1E1E1E",
},

// getHelpPill: {
//   backgroundColor: "#EAEAEA",
//   borderRadius: 999,
//   paddingHorizontal: 14,
//   paddingVertical: 8,
// },

getHelpPillText: {
  color: "#2FB56A",
  fontWeight: "500",
},

inputBox: {
  height: 56,
  borderRadius: 8,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#D9D2CC",
  paddingHorizontal: 14,
  justifyContent: "center",
},

input: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1E1E1E",
},

// primaryBtn: {
//   width: "100%",
//   height: 58,
//   borderRadius: 999,
//   backgroundColor: "#3FA465",
//   alignItems: "center",
//   justifyContent: "center",
//   marginBottom: 6,
// },

// primaryBtnText: {
//   color: "#fff",
//   fontSize: 18,
//   fontWeight: "500",
// },

/* header center title (security/privacy) */
stackHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 4,
  paddingBottom: 10,
},

headerTitle: {
  fontSize: 18,
  fontWeight: "500",
  color: "#1E1E1E",
},

card: {
  backgroundColor: "#fff",
  borderRadius: 14,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.05)",
},

settingRow: {
  paddingHorizontal: 14,
  paddingVertical: 16,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

settingLeft: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},

settingIcon: {
  width: 28,
  fontSize: 18,
  marginRight: 10,
  opacity: 0.9,
},

settingLabel: {
  fontSize: 15,
  fontWeight: "800",
  color: "#1E1E1E",
},

divider: {
  height: 1,
  backgroundColor: "rgba(0,0,0,0.07)",
  marginLeft: 50,
},

// chev: {
//   fontSize: 24,
//   color: "rgba(0,0,0,0.35)",
//   fontWeight: "500",
// },

/* profile */
profileTopBar: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingTop: 4,
},

banner: {
  height: 120,
  borderRadius: 14,
  overflow: "hidden",
  marginTop: 8,
  backgroundColor: "#D8D4F2",
},

bannerArt: {
  flex: 1,
  backgroundColor: "#CFCBF0",
},

profileHeader: {
  alignItems: "center",
  marginTop: -36,
  marginBottom: 8,
},

avatarWrap: {
  marginBottom: 10,
},

// avatarCircle: {
//   width: 72,
//   height: 72,
//   borderRadius: 999,
//   backgroundColor: "#E5E5E5",
//   borderWidth: 4,
//   borderColor: "#fff",
//   alignItems: "center",
//   justifyContent: "center",
// },

avatarPlus: {
  position: "absolute",
  right: -2,
  bottom: 0,
  width: 22,
  height: 22,
  borderRadius: 999,
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.08)",
},

profileName: {
  fontSize: 20,
  fontWeight: "500",
  color: "#1E1E1E",
},

greenCheck: {
  color: "#2FB56A",
  fontWeight: "500",
  fontSize: 18,
  marginLeft: 4,
},

profileEmail: {
  marginTop: 4,
  fontSize: 13,
  fontWeight: "700",
  color: "rgba(0,0,0,0.45)",
},

menuRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0,0,0,0.06)",
},

menuIconWrap: {
  width: 36,
  height: 36,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

menuIcon: {
  fontSize: 18,
},

menuTitle: {
  fontSize: 15,
  fontWeight: "500",
  color: "#1E1E1E",
},

menuSubtitle: {
  marginTop: 2,
  fontSize: 12.5,
  fontWeight: "700",
  color: "rgba(0,0,0,0.42)",
},

versionText: {
  fontSize: 12,
  fontWeight: "700",
  color: "rgba(0,0,0,0.35)",
  marginBottom: 10,
},

otpRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 18,
},

otpBox: {
  width: 52,
  height: 52,
  borderRadius: 10,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.18)",
  marginRight: 10,

  // ✅ center content
  alignItems: "center",
  justifyContent: "center",
},

otpChar: {
  fontSize: 20,
  fontWeight: "500",
  color: "#1E1E1E",

  // ✅ force proper centering
  textAlign: "center",
  
  lineHeight: 50,
},

otpBoxActive: {
  borderColor: "#2FB56A",
  borderWidth: 2,
},


otpHiddenInput: {
  position: "absolute",
  opacity: 0,
  width: 1,
  height: 1,
},
// shell: {
//   flex: 1,
//   backgroundColor: "#F6F3F0",
//   paddingHorizontal: 18,
//   paddingTop: 18,
// },

// topRow: {
//   flexDirection: "row",
//   alignItems: "center",
//   justifyContent: "space-between",
// },

// backBtn: {
//   width: 36,
//   height: 36,
//   borderRadius: 18,
//   alignItems: "center",
//   justifyContent: "center",
// },

// backIcon: {
//   fontSize: 20,
//   fontWeight: "500",
//   color: "#1E1E1E",
// },

// getHelpPill: {
//   backgroundColor: "#EAE6E2",
//   paddingHorizontal: 14,
//   paddingVertical: 8,
//   borderRadius: 999,
// },

// getHelpPillText: {
//   color: "#2FB56A",
//   fontWeight: "500",
// },

progressTrack: {
  height: 4,
  backgroundColor: "rgba(0,0,0,0.08)",
  borderRadius: 4,
  marginTop: 10,
  overflow: "hidden",
},

progressFill: {
  height: 4,
  width: "45%",
  backgroundColor: "#2FB56A",
},

// bigTitle: {
//   fontSize: 34,
//   fontWeight: "500",
//   color: "#1E1E1E",
//   letterSpacing: -0.5,
// },

// muted: {
//   color: "rgba(0,0,0,0.55)",
//   fontSize: 16,
//   fontWeight: "600",
// },

yellowInfo: {
  marginTop: 14,
  backgroundColor: "#F4E9B0",
  borderRadius: 10,
  padding: 14,
},

yellowInfoText: {
  color: "#2B2B2B",
  fontSize: 14,
  fontWeight: "700",
  lineHeight: 20,
},

label: {
  color: "rgba(0,0,0,0.75)",
  fontSize: 15,
  fontWeight: "800",
  marginBottom: 8,
},

// inputBox: {
//   backgroundColor: "#fff",
//   borderWidth: 1,
//   borderColor: "rgba(0,0,0,0.15)",
//   borderRadius: 8,
//   paddingHorizontal: 12,
//   height: 52,
//   justifyContent: "center",
// },

// input: {
//   fontSize: 16,
//   fontWeight: "700",
//   color: "#1E1E1E",
// },

twoColRow: {
  flexDirection: "row",
  marginTop: 16,
},

dobBox: {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.15)",
  borderRadius: 8,
  paddingHorizontal: 12,
  height: 52,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

calendarIcon: {
  fontSize: 18,
  opacity: 0.65,
},

infoRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 12,
},

infoIcon: {
  marginRight: 8,
  color: "#2FB56A",
  fontWeight: "500",
},

infoText: {
  color: "rgba(0,0,0,0.6)",
  fontWeight: "800",
},

// primaryBtn: {
//   height: 64,
//   borderRadius: 32,
//   backgroundColor: "#2FB56A",
//   alignItems: "center",
//   justifyContent: "center",
//   marginBottom: 18,
// },

// primaryBtnText: {
//   color: "#fff",
//   fontSize: 18,
//   fontWeight: "500",
// },

// disabledBigBtn: {
//   height: 64,
//   borderRadius: 32,
//   backgroundColor: "rgba(0,0,0,0.18)",
//   alignItems: "center",
//   justifyContent: "center",
//   marginBottom: 18,
// },

// disabledBigBtnText: {
//   color: "rgba(255,255,255,0.65)",
//   fontSize: 18,
//   fontWeight: "500",
// },

/* Modal bottom sheet */
// modalOverlay: {
//   flex: 1,
//   backgroundColor: "rgba(0,0,0,0.45)",
//   justifyContent: "flex-end",
// },

// sheet: {
//   backgroundColor: "#fff",
//   borderTopLeftRadius: 22,
//   borderTopRightRadius: 22,
//   padding: 18,
//   paddingBottom: 22,
// },

sheetHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

// sheetClose: {
//   width: 36,
//   height: 36,
//   borderRadius: 18,
//   alignItems: "center",
//   justifyContent: "center",
// },

// sheetTitle: {
//   fontSize: 18,
//   fontWeight: "500",
//   color: "#1E1E1E",
// },

sheetText: {
  marginTop: 14,
  textAlign: "center",
  color: "rgba(0,0,0,0.65)",
  fontSize: 15,
  fontWeight: "800",
  lineHeight: 22,
},

/* Password fields */
// passwordBox: {
//   backgroundColor: "#fff",
//   borderWidth: 1,
//   borderColor: "rgba(0,0,0,0.15)",
//   borderRadius: 8,
//   paddingHorizontal: 12,
//   height: 52,
//   flexDirection: "row",
//   alignItems: "center",
//   justifyContent: "space-between",
// },

showText: {
  color: "#2FB56A",
  fontWeight: "500",
},

ruleRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},

ruleDot: {
  width: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.35)",
  marginRight: 10,
},

ruleText: {
  color: "rgba(0,0,0,0.65)",
  fontWeight: "800",
  flex: 1,
  lineHeight: 20,
},

/* Referral */
welcomeTiny: {
  marginTop: 18,
  fontWeight: "500",
  letterSpacing: 0.5,
  color: "rgba(0,0,0,0.7)",
},

// outlineBtn: {
//   height: 64,
//   borderRadius: 32,
//   borderWidth: 2,
//   borderColor: "#2FB56A",
//   alignItems: "center",
//   justifyContent: "center",
// },



referralIllustration: {
  width: "100%",
  height: 240,
  marginTop: 10,
},

/* Global account */
globalHeroWrap: {
  width: "100%",
  height: 320,
  backgroundColor: "#5EA8FF",
},

globalHero: {
  width: "100%",
  height: "100%",
},

globalCard: {
  marginTop: -28,
  backgroundColor: "#fff",
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  paddingHorizontal: 18,
  paddingTop: 18,
},

globalTitle: {
  fontSize: 26,
  fontWeight: "500",
  color: "#1E1E1E",
  marginBottom: 12,
},

globalRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  marginBottom: 14,
},

globalIcon: {
  fontSize: 22,
  marginRight: 12,
  marginTop: 2,
},

globalRowTitle: {
  fontSize: 16,
  fontWeight: "500",
  color: "#1E1E1E",
},

globalRowSub: {
  marginTop: 4,
  color: "rgba(0,0,0,0.6)",
  fontWeight: "700",
  lineHeight: 20,
},

pinError: {
  marginTop: 12,
  paddingVertical: 6,
  paddingHorizontal: 12,
  backgroundColor: "#FDECEC",
  color: "#B42318",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: "600",
  textAlign: "center",
  alignSelf: "center",
},
passwordBox: {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.15)",
  borderRadius: 8,
  paddingHorizontal: 12,
  height: 52,
  flexDirection: "row",
  alignItems: "center",
},

passwordInput: {
  flex: 1,              // ✅ THIS makes the input touchable + focusable
  height: "100%",
  fontSize: 16,
  fontWeight: "700",
  color: "#1E1E1E",
  paddingVertical: 0,   // ✅ helps Android
},

showBtn: {
  paddingLeft: 12,
  paddingVertical: 10,
},

addAccountPill: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: "Transparent",
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 8,
  marginTop: 12,
  borderWidth: 1,
  borderColor: COLORS.green,
},

addAccountIcon: {
  fontSize: 18,
  color: COLORS.green,
  fontWeight: "600",
  marginRight: 6,
},

addAccountText: {
  fontSize: 15,
  fontWeight: "700",
  color: COLORS.green,
},

trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    marginRight: 10,
  },
  flag: {
    fontSize: 24,
    marginRight: 6,
  },
  arrow: {
    fontSize: 10,
    color: "#666",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 30,
    position: "absolute",
    width: "100%",
    bottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 18,
    color: "#333",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    fontSize: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemSelected: {
    backgroundColor: "#E8F5E9",
  },
  itemFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  itemDialCode: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: COLORS.green,
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#999",
  },
  // Add these to your StyleSheet.create({...})

topRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 8,
},

backArrow: {
  fontSize: 22,
  fontWeight: "700",
  color: "#111",
},

getHelpPill: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  backgroundColor: "#EFEFEF",
  borderRadius: 999,
},

getHelpText: {
  fontWeight: "800",
  color: "#2D9D62",
},

centerIconWrap: {
  marginTop: 26,
  alignItems: "center",
  justifyContent: "center",
},

centerIcon: {
  width: 95,
  height: 95,
},

checkEmailTitle: {
  marginTop: 18,
  fontSize: 30,
  fontWeight: "500",
  textAlign: "center",
  color: "#111",
},

checkEmailSub: {
  marginTop: 10,
  fontSize: 15,
  textAlign: "center",
  color: "#666",
},

checkEmailEmail: {
  marginTop: 8,
  fontSize: 16,
  fontWeight: "800",
  textAlign: "center",
  color: "#111",
},

changeEmailLink: {
  marginTop: 8,
  fontSize: 15,
  fontWeight: "800",
  textAlign: "center",
  color: "#2D9D62",
},

checkEmailHint: {
  marginTop: 14,
  fontSize: 15,
  lineHeight: 22,
  textAlign: "center",
  color: "#777",
  paddingHorizontal: 18,
},

// outlineBtn: {
//   marginTop: 14,
//   borderWidth: 2,
//   borderColor: "#2D9D62",
//   borderRadius: 999,
//   paddingVertical: 16,
//   alignItems: "center",
//   justifyContent: "center",
// },


/* -------- Verify Email Card (small card UI) -------- */
verifyCard: {
  backgroundColor: "#ffffffff",
  borderRadius: 18,
  width: "96%",
  margin: 9,
  borderWidth: 1,
  borderColor: "rgba(0, 0, 0, 0.17)",
  padding: 16,
  flexDirection: "row",
  marginTop: 22,
  alignItems: "center",
  justifyContent: "space-between",
},

verifyCardLeft: {
  flex: 1,
  paddingRight: 12,
},

verifySmallTitle: {
  color: "#2D9D62",
  fontWeight: "800",
  fontSize: 13,
  marginBottom: 6,
},

verifyBigTitle: {
  color: "#111",
  fontWeight: "500",
  fontSize: 22,
  marginBottom: 10,
},

verifyProgressRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

verifyProgressTrack: {
  flex: 1,
  height: 10,
  backgroundColor: "#D9D9D9",
  borderRadius: 999,
  overflow: "hidden",
  marginRight: 10,
},

verifyProgressFill: {
  width: "100%", // ~1/5
  height: "100%",
  backgroundColor: "#6a55edff",
  // backgroundColor: "#2D9D62",
  borderRadius: 999,
},
verifyProgressHalf: {
  width: "50%", // ~1/2
  height: "100%",
  backgroundColor: "#6a55edff",
  // backgroundColor: "#2D9D62",
  borderRadius: 999,
},
verifyProgressEmpty: {
  width: "0%", // ~1/2
  height: "100%",
  backgroundColor: "#D9D9D9",
  borderRadius: 999,
},

verifyProgressText: {
  color: "#333",
  fontWeight: "700",
  fontSize: 13,
},

verifyCardBtn: {
  backgroundColor: "#2D9D62",
  borderRadius: 999,
  paddingVertical: 14,
  alignItems: "center",
  justifyContent: "center",
},

verifyCardBtnText: {
  color: "#fff",
  fontWeight: "500",
  fontSize: 16,
},

verifyCardIcon: {
  width: 54,
  height: 54,
},


otpRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 18,
  paddingHorizontal: 8,
},

otpBox: {
  width: 52,
  height: 52,
  borderRadius: 10,
  borderWidth: 1.5,
  borderColor: "#DADADA",
  backgroundColor: "#fff",
  textAlign: "center",
  fontSize: 20,
  fontWeight: "500",
  color: "#111",
},


otpBoxFilled: {
  borderColor: "#CFCFCF",
},

resendText: {
  textAlign: "left",
  color: "#333",
  fontSize: 15,
  fontWeight: "600",
  marginTop: 8,
  paddingHorizontal: 6,
},

resendLink: {
  color: "#2D9D62",
  fontWeight: "500",
},

resendTimer: {
  color: "#111",
  fontWeight: "500",
},

simpleHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingTop: 4,
  paddingBottom: 8,
},

addAccCard: {
  backgroundColor: "#fff",
  borderRadius: 14,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.05)",
},

addAccRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 16,
},

addAccFlag: {
  fontSize: 26,
  marginRight: 12,
},

addAccTitle: {
  fontSize: 16,
  fontWeight: "500",
  color: "#1E1E1E",
},

addAccSubtitle: {
  marginTop: 4,
  fontSize: 13,
  fontWeight: "700",
  color: "rgba(0,0,0,0.45)",
},

addAccDivider: {
  height: 1,
  backgroundColor: "rgba(0,0,0,0.07)",
  marginLeft: 54, // aligns divider after flag
},


accountCardShadow: {
  borderRadius: 16,
  backgroundColor: "#fff",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
  elevation: 8,
},

// accountCardGradient: {
//   borderRadius: 16,
//   padding: 16,
//   minWidth: 180,
  
// },

cardCornerImage: {
  position: "absolute",
  right: -15,   // tweak for visual style
  bottom: -10,  // tweak for visual style
  width: 90,
  height: 90,
  opacity: 1, // optional (fintech look)
  zIndex: 1,
},


fxCard: {
  backgroundColor: "#fff",
  marginHorizontal: 16,
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.06)",
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
},

fxHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

fxTitle: {
  fontSize: 16,
  fontWeight: "600",
  color: "#1E1E1E",
},

fxSubtitle: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "500",
  color: "rgba(0,0,0,0.45)",
},

fxSeeAll: {
  fontSize: 13,
  fontWeight: "600",
  color: "#19955f",
},

fxDivider: {
  height: 1,
  backgroundColor: "rgba(0,0,0,0.06)",
  marginTop: 12,
  marginBottom: 6,
},

fxRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 12,
},

fxLeft: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},

fxFlags: {
  width: 54,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
},

fxFlag: {
  fontSize: 18,
  marginRight: 6,
},

fxPair: {
  fontSize: 14,
  fontWeight: "600",
  color: "#1E1E1E",
},

fxPairSub: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "500",
  color: "rgba(0,0,0,0.45)",
},

fxRight: {
  flexDirection: "row",
  alignItems: "center",
},

fxChangePill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
  marginRight: 10,
},

fxUp: {
  backgroundColor: "rgba(25,149,95,0.10)",
  borderColor: "rgba(25,149,95,0.22)",
},

fxDown: {
  backgroundColor: "rgba(220,53,69,0.10)",
  borderColor: "rgba(220,53,69,0.22)",
},

fxChangeText: {
  fontSize: 12,
  fontWeight: "500",
},

fxUpText: { color: "#19955f" },
fxDownText: { color: "#dc3545" },

fxChevron: {
  fontSize: 22,
  color: "rgba(0,0,0,0.25)",
  marginTop: -2,
},

fxFooter: {
  marginTop: 6,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: "rgba(0,0,0,0.06)",
},

fxFooterText: {
  fontSize: 12,
  fontWeight: "500",
  color: "rgba(0,0,0,0.40)",
},

notifHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingTop: 6,
  paddingBottom: 10,
},

notifHeaderTitle: {
  flex: 1,
  textAlign: "center",
  fontSize: 18,
  fontWeight: "600",
  color: "#1E1E1E",
  marginRight: 44, // balances right action width
},

notifHeaderAction: {
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: "rgba(25,149,95,0.10)",
},

notifHeaderActionText: {
  color: "#19955f",
  fontWeight: "600",
  fontSize: 12,
},

notifFiltersRow: {
  flexDirection: "row",
  paddingHorizontal: 16,
  marginTop: 6,
},

notifFilterPill: {
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 999,
  backgroundColor: "rgba(0,0,0,0.06)",
  marginRight: 10,
},

notifFilterPillActive: {
  backgroundColor: "#1E1E1E",
},

notifFilterText: {
  fontSize: 13,
  fontWeight: "600",
  color: "rgba(0,0,0,0.55)",
},

notifFilterTextActive: {
  color: "#fff",
},

notifSectionTitle: {
  paddingHorizontal: 16,
  fontSize: 12,
  fontWeight: "600",
  color: "rgba(0,0,0,0.45)",
  marginBottom: 8,
},

notifCard: {
  backgroundColor: "#fff",
  marginHorizontal: 16,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.06)",
  overflow: "hidden",
},

notifRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 14,
  paddingVertical: 14,
},

notifLeft: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},

notifIconWrap: {
  width: 42,
  height: 42,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
  backgroundColor: "rgba(0,0,0,0.06)",
},

notifIconSuccess: {
  backgroundColor: "rgba(25,149,95,0.12)",
},

notifIconWarning: {
  backgroundColor: "rgba(255,193,7,0.18)",
},

notifIconInfo: {
  backgroundColor: "rgba(13,110,253,0.12)",
},

notifIconText: {
  fontSize: 18,
},

notifTitleRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginRight: 10,
},

notifTitle: {
  fontSize: 14,
  fontWeight: "600",
  color: "#1E1E1E",
  flex: 1,
  paddingRight: 10,
},

notifTitleUnread: {
  color: "#000",
},

notifUnreadDot: {
  width: 8,
  height: 8,
  borderRadius: 999,
  backgroundColor: "#19955f",
},

notifBody: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "700",
  color: "rgba(0,0,0,0.50)",
},

notifTime: {
  marginTop: 6,
  fontSize: 11,
  fontWeight: "700",
  color: "rgba(0,0,0,0.35)",
},

notifChevron: {
  fontSize: 22,
  color: "rgba(0,0,0,0.25)",
  marginLeft: 10,
},

notifDivider: {
  height: 1,
  backgroundColor: "rgba(0,0,0,0.07)",
  marginLeft: 68, // align after icon
},

notifEmpty: {
  paddingTop: 80,
  alignItems: "center",
  paddingHorizontal: 30,
},

notifEmptyTitle: {
  marginTop: 12,
  fontSize: 18,
  fontWeight: "600",
  color: "#1E1E1E",
},

notifEmptySub: {
  marginTop: 8,
  fontSize: 13,
  fontWeight: "700",
  textAlign: "center",
  color: "rgba(0,0,0,0.45)",
},

resultHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingTop: 6,
  paddingBottom: 10,
},

resultWrap: {
  flex: 1,
  paddingHorizontal: 16,
  justifyContent: "center",
  paddingBottom: 24,
},

resultCard: {
  borderRadius: 22,
  paddingHorizontal: 18,
  paddingTop: 22,
  paddingBottom: 18,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.06)",
},

resultIconRing: {
  width: 92,
  height: 92,
  borderRadius: 46,
  alignSelf: "center",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
},

resultIconInner: {
  width: 74,
  height: 74,
  borderRadius: 37,
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 8,
},

resultTitle: {
  fontSize: 22,
  fontWeight: "600",
  color: "#1E1E1E",
  textAlign: "center",
  marginTop: 2,
},

resultSubtitle: {
  fontSize: 13,
  fontWeight: "700",
  color: "rgba(0,0,0,0.55)",
  textAlign: "center",
  marginTop: 8,
  lineHeight: 18,
},

resultDetailsBox: {
  marginTop: 14,
  padding: 12,
  borderRadius: 14,
  backgroundColor: "rgba(255,255,255,0.75)",
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.06)",
},

resultDetailsText: {
  fontSize: 12,
  fontWeight: "700",
  color: "rgba(0,0,0,0.60)",
  lineHeight: 18,
},

resultPrimaryBtn: {
  marginTop: 16,
  height: 56,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
},

resultPrimaryBtnText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 16,
},

resultSecondaryBtn: {
  marginTop: 14,
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 10,
},

resultSecondaryText: {
  fontWeight: "600",
  fontSize: 14,
},

// Mid-market disclaimer (FX)

midMarketBox: {
  marginTop: 16,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(245, 158, 11, 0.30)", // amber border
  backgroundColor: "rgba(245, 158, 11, 0.06)", // amber background
  padding: 14,
},

midMarketRow: {
  flexDirection: "row",
  alignItems: "flex-start",
},

midMarketIconWrap: {
  width: 28,
  height: 28,
  borderRadius: 999,
  backgroundColor: "rgba(245, 158, 11, 0.15)",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
  marginTop: 2,
},

midMarketIcon: {
  color: "#B45309", // amber-700
},

midMarketTextWrap: {
  flex: 1,
},

midMarketTitle: {
  fontSize: 14,
  fontWeight: "800",
  color: "#111827",
},

midMarketDescription: {
  fontSize: 12.5,
  color: "#6B7280",
  marginTop: 6,
  lineHeight: 18,
},

midMarketStrong: {
  fontWeight: "800",
  color: "#111827",
},

// Support Chat

chatHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingTop: 10,
  paddingBottom: 12,
},

chatHeaderBack: {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
  borderWidth: 1,
  borderColor: "#EEF0F3",
},

chatHeaderTitle: {
  fontSize: 16,
  fontWeight: "600",
  color: "#111827",
},

chatHeaderSubRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 3,
},

chatOnlineDot: {
  width: 8,
  height: 8,
  borderRadius: 99,
  backgroundColor: "#22C55E",
  marginRight: 6,
},

chatHeaderSubtitle: {
  fontSize: 11.5,
  color: "#6B7280",
  fontWeight: "600",
},

chatHeaderIconBtn: {
  width: 40,
  height: 40,
  borderRadius: 12,
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 10,
  borderWidth: 1,
  borderColor: "#EEF0F3",
},

chatQuickWrap: {
  paddingBottom: 10,
},

chatQuickPill: {
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: "#fff",
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#EEF0F3",
  marginRight: 10,
},

chatQuickText: {
  fontSize: 12.5,
  fontWeight: "800",
  color: "#111827",
},

chatListContent: {
  paddingHorizontal: 16,
  paddingBottom: 14,
},

chatRow: {
  flexDirection: "row",
  alignItems: "flex-end",
  marginTop: 10,
},

chatRowLeft: {
  justifyContent: "flex-start",
},

chatRowRight: {
  justifyContent: "flex-end",
},

chatAvatar: {
  width: 34,
  height: 34,
  borderRadius: 12,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#EEF0F3",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 8,
},

chatBubble: {
  maxWidth: "78%",
  borderRadius: 16,
  paddingHorizontal: 12,
  paddingVertical: 10,
},

chatBubbleSupport: {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#EEF0F3",
  borderTopLeftRadius: 8,
},

chatBubbleUser: {
  backgroundColor: "#111827",
  borderTopRightRadius: 8,
},

chatText: {
  fontSize: 13.5,
  lineHeight: 19,
},

chatTextSupport: {
  color: "#111827",
  fontWeight: "600",
},

chatTextUser: {
  color: "#fff",
  fontWeight: "600",
},

chatTime: {
  marginTop: 6,
  fontSize: 10.5,
  fontWeight: "700",
},

chatTimeSupport: {
  color: "#9CA3AF",
  textAlign: "right",
},

chatTimeUser: {
  color: "rgba(255,255,255,0.7)",
  textAlign: "right",
},

chatComposerWrap: {
  flexDirection: "row",
  alignItems: "flex-end",
  paddingHorizontal: 16,
  paddingTop: 10,
  paddingBottom: Platform.OS === "ios" ? 14 : 12,
  borderTopWidth: 1,
  borderTopColor: "#EEF0F3",
  backgroundColor: "#F8F9FB",
},

chatAttachBtn: {
  width: 42,
  height: 42,
  borderRadius: 14,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#EEF0F3",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
},

chatInputBox: {
  flex: 1,
  minHeight: 42,
  maxHeight: 110,
  borderRadius: 16,
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#EEF0F3",
  paddingHorizontal: 12,
  paddingVertical: 10,
},

chatInput: {
  fontSize: 14,
  color: "#111827",
  fontWeight: "600",
},

chatSendBtn: {
  width: 42,
  height: 42,
  borderRadius: 14,
  backgroundColor: "#19955f", // matches your green tone vibe
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 10,
},

headerCenterTitle: {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  alignContent: "center",
  justifyContent: "center",
  fontSize: 16,
  fontWeight: "600",
  color: "#111827",
},

headerRightSpacer: {
  width: 44, // MUST match back button width for perfect centering
},


itemBalance: {
  fontSize: 12,
  color: "#6B7280",
  marginTop: 2,
  fontWeight: "600",
},



recipientScreen: {
    // flex: 1,
    width: "100%",
    // paddingTop: 10,
    // paddingBottom: 16,
  },

  recipientHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text || "#111827",
    textAlign: "center",
    flex: 1,
  },

  helpCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDEDED",
    alignItems: "center",
    justifyContent: "center",
  },
  helpCircleText: {
    fontWeight: "600",
    color: COLORS.text || "#111827",
  },

  recipientCard: {
    // backgroundColor: "#F7F7F7",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },

  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },

  // Reusable input wrapper (same look everywhere)
  inputWrap: {
    borderWidth: 1,
    borderColor: "#767778ff",
    // backgroundColor: "#FFFFFF",
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapVerified: {
    borderColor: COLORS.green 
  },

  inputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  inputPlaceholderText: {
    color: "#9CA3AF",
    fontWeight: "500",
  },

  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    padding: 0,
  },

  verifiedTick: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.green,
  },

  verifiedCard: {
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  verifiedCardSmall: {
    fontSize: 12,
    fontWeight: "500",
    color: "#065F46",
  },
  verifiedCardName: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "500",
    color: "#065F46",
  },

//   toggleRow: {
//     marginTop: 16,
//     flexDirection: "row",
//     alignItems: "center",
//   },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackOn: {
    backgroundColor: "#059669",
  },
  toggleTrackOff: {
    backgroundColor: "#D1D5DB",
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  toggleLabel: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },

  helperHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  bottomArea: {
    marginTop: 16,
  },

  /**
   * Bank Sheet (Bottom modal)
   */
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
//   sheet: {
//     backgroundColor: "#FFFFFF",
//     borderTopLeftRadius: 22,
//     borderTopRightRadius: 22,
//     paddingBottom: 10,
//     overflow: "hidden",
//   },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginTop: 10,
    marginBottom: 8,
  },
//   sheetHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 14,
//     paddingBottom: 10,
//   },
//   sheetTitle: {
//     flex: 1,
//     textAlign: "center",
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#111827",
//   },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#111827",
  },

  // searchWrap: {
  //   marginHorizontal: 14,
  //   borderWidth: 1,
  //   borderColor: "#E5E7EB",
  //   borderRadius: 12,
  //   paddingHorizontal: 12,
  //   paddingVertical: 12,
  //   flexDirection: "row",
  //   alignItems: "center",
  //   backgroundColor: "#FFFFFF",
  // },
  // searchIcon: {
  //   fontSize: 18,
  //   marginRight: 10,
  //   color: "#9CA3AF",
  // },
 

  bankRow: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  bankRowSelected: {
    backgroundColor: "#F0FDF4",
  },
  bankRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  bankRowArrow: {
    fontSize: 22,
    fontWeight: "600",
    color: "#16A34A",
  },

  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#9CA3AF",
    fontWeight: "700",
  },

  recipientListContainer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    flex: 1,
  },

  recipientListHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  recipientListBackBtn: {
    paddingVertical: 8,
    paddingRight: 10,
  },

  recipientListBackIcon: {
    fontSize: 22,
  },

  recipientListTitle: {
    fontSize: 20,
    fontWeight: "800",
  },

  recipientListHelpCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDEDED",
    alignItems: "center",
    justifyContent: "center",
  },

  recipientListHelpText: {
    fontWeight: "800",
  },

  recipientListSearchWrap: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  recipientListSearchIcon: {
    fontSize: 18,
    marginRight: 10,
    color: "#9CA3AF",
  },

  recipientListSearchInput: {
    flex: 1,
    fontSize: 15,
  },

  recipientListNewRow: {
    marginTop: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
    flexDirection: "row",
    alignItems: "center",
  },

  recipientListNewIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDEDED",
    alignItems: "center",
    justifyContent: "center",
  },

  recipientListNewIconPlus: {
    fontSize: 24,
  },

  recipientListNewText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "700",
  },

  recipientListSectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
  },

  recipientListRow: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  recipientListAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B2461",
    alignItems: "center",
    justifyContent: "center",
  },

  recipientListAvatarText: {
    color: "#fff",
    fontWeight: "600",
  },

  recipientListRowInfo: {
    marginLeft: 12,
    flex: 1,
  },

  recipientListRowName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  recipientListRowSub: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },

  recipientListChevron: {
    color: "#16A34A",
    fontSize: 22,
  },

  recipientListEmpty: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 30,
  },

  recipientListBottomSpacer: {
    height: 40,
  },
headerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  helpCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDEDED",
    alignItems: "center",
    justifyContent: "center",
  },
  helpCircleText: {
    fontWeight: "600",
    color: "#111827",
  },
  searchWrap: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    fontSize: 40,
    // marginRight: 10,
    color: "#9CA3AF",
  },


  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  backBtn: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backIcon: {
    fontSize: 22,
  },

  sentLabel: {
    color: "#16A34A",
    fontWeight: "600",
    fontSize: 12,
    textTransform: "lowercase",
    marginBottom: 8,
  },
  bigAmount: {
    fontSize: 28,
    fontWeight: "600",
    color: "#111827",
  },
  dateText: {
    marginTop: 8,
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 12,
  },

  segmentWrap: {
    marginTop: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#fff",
  },
  segmentText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 12,
  },
  segmentTextActive: {
    color: "#111827",
  },

  card: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFEFEF",
  },
  rowLabel: {
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 12,
  },
  rowValue: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 12,
    maxWidth: "62%",
    textAlign: "right",
  },

  divider: {
    marginTop: 10,
    marginBottom: 6,
    height: 1,
    backgroundColor: "#E5E7EB",
    opacity: 0.7,
  },

  statementRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(25,149,95,0.10)",
  },
  downloadIcon: {
    marginRight: 8,
    color: "#19955f",
    fontWeight: "600",
  },
  downloadText: {
    color: "#19955f",
    fontWeight: "600",
    fontSize: 12,
  },

  refRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
  },
  refText: {
    marginTop: 6,
    fontWeight: "600",
    color: "#111827",
    fontSize: 12,
  },
  copyBtn: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  copyText: {
    fontWeight: "600",
    color: "#111827",
    fontSize: 12,
  },

  bottomArea: {
    marginTop: 14,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
 

  muted: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 13,
  },

  updateRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#19955f",
    marginTop: 4,
    marginRight: 10,
  },
  updateTitle: {
    fontWeight: "600",
    color: "#111827",
    fontSize: 13,
  },
  updateSub: {
    marginTop: 2,
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 12,
  },
  updateTime: {
    marginLeft: 10,
    color: "#9CA3AF",
    fontWeight: "800",
    fontSize: 11,
  },
  
  amountCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  typeLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600" as const,
    marginBottom: 8,
  },
  amount: {
    fontSize: 26,
    fontWeight: "900" as const,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700" as const,
    textTransform: "capitalize" as const,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#9CA3AF",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500" as const,
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600" as const,
    textAlign: "right" as const,
    flex: 1,
    marginLeft: 16,
  },
  conversionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  conversionBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
    alignItems: "center" as const,
  },
  conversionLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  conversionAmount: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "800" as const,
  },
  conversionArrow: {
    fontSize: 20,
    color: "#6b7280",
    marginHorizontal: 12,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  helpButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center" as const,
  },
  helpButtonText: {
    color: "#374151",
    fontWeight: "600" as const,
    fontSize: 14,
  },
/* =========================
   WALLET - TRANSACTIONS UI
========================= */

walletTxWrap: {
  marginTop: 12,
  paddingHorizontal: 16,
  flex: 1,
},

walletTxLoading: {
  marginTop: 24,
},

walletTxEmpty: {
  color: "#9CA3AF",
  textAlign: "center",
  marginTop: 24,
  fontWeight: "800",
},

walletTxGroupTitle: {
  marginTop: 14,
  marginBottom: 8,
  fontSize: 12,
  fontWeight: "600",
  color: "#111827",
},

walletTxCard: {
  backgroundColor: "#fff",
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  overflow: "hidden",
},

walletTxRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
  paddingVertical: 12,
},

walletTxDivider: {
  height: 1,
  backgroundColor: "#F1F5F9",
  marginLeft: 52,
},

walletTxIconWrap: {
  width: 36,
  height: 36,
  borderRadius: 10,
  backgroundColor: "#F3F4F6",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
},

walletTxIconText: {
  fontSize: 14,
  fontWeight: "600",
  color: "#111827",
},

walletTxMid: {
  flex: 1,
},

walletTxName: {
  fontSize: 13,
  fontWeight: "600",
  color: "#111827",
},

walletTxBank: {
  marginTop: 3,
  fontSize: 11,
  fontWeight: "800",
  color: "#6B7280",
},

walletTxMetaRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
},

walletTxTime: {
  fontSize: 11,
  fontWeight: "800",
  color: "#6B7280",
},

walletTxStatus: {
  fontSize: 11,
  fontWeight: "600",
},

walletTxRight: {
  alignItems: "flex-end",
},

walletTxAmt: {
  fontSize: 12,
  fontWeight: "600",
  color: "#111827",
},

walletTxAmtNeg: {
  color: "#111827",
},

walletTxAmtPos: {
  color: "#16A34A",
},

walletTxStatusCompleted: {
  color: "#19955f",
},

walletTxStatusPending: {
  color: "#B45309",
},

walletTxStatusFailed: {
  color: "#EF4444",
},

inputIcon: {
  fontSize: 40,
  color: "#9CA3AF",
  position: "absolute",
  left: 5,
  
},

recentEmptyCard: {
  marginTop: 20,
  marginBottom: 20,
  bottom: 0,
  backgroundColor: "#fff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  padding: 14,
  alignItems: "center",
  left: 0,
  width: "40%",
},

recentEmptyIconCircle: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(25,149,95,0.12)",
  borderWidth: 1,
  borderColor: "rgba(25,149,95,0.25)",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

recentEmptyTitle: {
  fontSize: 14,
  fontWeight: "600",
  color: "#111827",
  textAlign: "center",
},

recentEmptySub: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "600",
  color: "#6B7280",
  lineHeight: 16,
},

recentEmptyBtn: {
  marginTop: 10,
  alignSelf: "flex-start",
  backgroundColor: "rgba(25,149,95,0.12)",
  borderWidth: 1,
  borderColor: "rgba(25,149,95,0.25)",
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 8,
},

recentEmptyBtnText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#19955f",
},


})

/*
 * pilot-overrides.js — PILOT BUILD ONLY.
 *
 * Keys whose production wording promises payment, describes ethics
 * approval, or refers to "paid rounds". Applied over the production
 * catalogues at boot, so every other string on every screen is the
 * reviewed original.
 */

export const PILOT_EN = {
  pilot_notice_title: "Before you start",
  pilot_notice_body:
    "This is a pilot run used to test a research task. Taking part is voluntary, there is no payment, your answers are used only to check that the task works, and you can stop at any time by closing this page.",
  pilot_notice_confirm: "I understand and would like to take part.",
  pilot_notice_continue: "Start",
  pilot_notice_error: "Please tick the box to continue.",

  elig_prior_note: "Each person takes part once. If you have already done this task in another session, please do not continue — thank you for your honesty.",
  quiz_intro: "Please answer all questions correctly before the rounds begin. You may retry as often as needed, without penalty.",
  beliefs_intro: "Before seeing your results, please give your best estimate in answer to two questions about the rounds you just played. Each question can earn up to {M} points: you receive {M} points if your estimate is exactly correct, minus 1 point for each unit of difference between your estimate and the true number (never below 0). These points are added to your score.",
  r_counted: "Total score",
  r_floor: "The total never falls below zero: if starting points plus decision and estimation points come to less than zero, the total counts as 0.",
  done_code_label: "Session reference:",
  done_keep: "This was a pilot run to test the task, so there is no payment. Thank you for taking part — you can close this page now.",
  end_confirm_body: "If you end now, your session closes and cannot be reopened. The decisions you have made so far stay recorded.",
  ended_body: "Your session has been closed. If you would like your answers removed, contact the research team at quangn@gmail.com and mention code {CODE}.",
  prior: "Have you taken part in a research experiment before?"
};

export const PILOT_VI = {
  pilot_notice_title: "Trước khi bắt đầu",
  pilot_notice_body:
    "Đây là phiên chạy thử để kiểm tra một nhiệm vụ nghiên cứu. Việc tham gia là tự nguyện, không có khoản thanh toán nào, câu trả lời của bạn chỉ được dùng để kiểm tra nhiệm vụ có hoạt động đúng hay không, và bạn có thể dừng bất cứ lúc nào bằng cách đóng trang này.",
  pilot_notice_confirm: "Tôi đã hiểu và muốn tham gia.",
  pilot_notice_continue: "Bắt đầu",
  pilot_notice_error: "Vui lòng tích vào ô để tiếp tục.",

  elig_prior_note: "Mỗi người chỉ tham gia một lần. Nếu bạn đã làm nhiệm vụ này ở phiên khác, vui lòng không tiếp tục — cảm ơn sự trung thực của bạn.",
  quiz_intro: "Vui lòng trả lời đúng tất cả các câu hỏi trước khi các vòng bắt đầu. Bạn có thể làm lại bao nhiêu lần tuỳ ý, không bị trừ gì cả.",
  beliefs_intro: "Trước khi xem kết quả, vui lòng đưa ra ước tính tốt nhất của bạn cho hai câu hỏi về các vòng bạn vừa chơi. Mỗi câu có thể được tối đa {M} điểm: bạn nhận {M} điểm nếu ước tính hoàn toàn chính xác, trừ 1 điểm cho mỗi đơn vị chênh lệch giữa ước tính của bạn và con số thật (không bao giờ dưới 0). Số điểm này được cộng vào tổng điểm của bạn.",
  r_counted: "Tổng điểm",
  r_floor: "Tổng điểm không bao giờ dưới 0: nếu điểm khởi đầu cộng điểm quyết định và điểm ước tính nhỏ hơn 0 thì tổng được tính là 0.",
  done_code_label: "Mã phiên:",
  done_keep: "Đây là phiên chạy thử để kiểm tra nhiệm vụ, nên không có khoản thanh toán nào. Cảm ơn bạn đã tham gia — bạn có thể đóng trang này.",
  end_confirm_body: "Nếu bạn kết thúc bây giờ, phiên của bạn sẽ đóng lại và không thể mở lại. Các quyết định bạn đã đưa ra vẫn được ghi nhận.",
  ended_body: "Phiên của bạn đã đóng. Nếu bạn muốn xoá câu trả lời của mình, vui lòng liên hệ nhóm nghiên cứu tại quangn@gmail.com và nhắc mã {CODE}.",
  prior: "Bạn đã từng tham gia một thí nghiệm nghiên cứu nào trước đây chưa?"
};

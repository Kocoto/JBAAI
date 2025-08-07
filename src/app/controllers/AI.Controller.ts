import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
class AiController {
  async chat(req: Request, res: Response) {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "userMessage is required." });
      }
      const systemMessage = `
      Bạn là một trợ lý ảo chuyên tư vấn về các sản phẩm và dịch vụ của công ty chúng tôi.
      Hãy chỉ trả lời dựa trên các thông tin được cung cấp dưới đây và không trả lời những câu hỏi nằm ngoài phạm vi này.
      Nếu người dùng hỏi về bất kỳ chủ đề nào khác, hãy lịch sự từ chối và nói rằng bạn chỉ có thể tư vấn về sản phẩm và dịch vụ của chúng tôi.

      --- CƠ SỞ TRI THỨC VỀ SẢN PHẨM/DỊCH VỤ CỦA CHÚNG TÔI ---
      Đánh giá thực tế về JBA Glucotrojan® với Reducosc® về phản ứng đường huyết
Tóm tắt
Dự án tập trung vào việc đánh giá hiệu quả thực tế của JBA GlucoTrojan, một gói bột bổ sung chứa Reducosc, một chiết xuất tự nhiên từ Lá dâu tằm trắng, đã được khoa học chứng minh là làm giảm sự hấp thụ đường và carbs lên đến 40%. Nghiên cứu nhằm mục đích so sánh tác dụng của việc uống GlucoTrojan với một bữa ăn (Bữa ăn thử nghiệm) so với việc chỉ ăn bữa ăn đó (kiểm soát) đối với phản ứng đường huyết của những người trưởng thành khỏe mạnh, tiền tiểu đường hoặc không phụ thuộc insulin trong một khoảng thời gian 14 ngày. Dự kiến rằng GlucoTrojan sẽ làm giảm diện tích tăng thêm dưới đường cong và đỉnh điểm cho nồng độ glucose huyết tương trong hơn 120 phút ở những người trưởng thành có lượng đường huyết bình thường khi so với phản ứng với bữa ăn kiểm soát.
Nhà tài trợ: AQP Pharmaceuticals, Inc.
Tổ chức nghiên cứu hợp đồng: Tastermonial Inc
Điều tra viên chính (PI): Guillermo Repizo, PhD.
Đồng điều tra viên: Budde Piccin, CEO
Ngày: 03/20/2023
Về Tastermonial
Tastermonial và các thương hiệu thực phẩm bổ sung sử dụng Nền tảng Tastermonial để chứng minh các tuyên bố sức khỏe trao đổi chất bằng cách thu thập dữ liệu hướng dẫn từ các thành viên trong một cách hiệu quả về chi phí.
Tastermonial bao gồm các nhà khoa học và kỹ sư đam mê thực hiện các nghiên cứu khoa học công dân để giúp các công ty và đối tác của họ kiểm tra hiệu quả của sản phẩm (s) của họ thông qua các màn hình glucose liên tục (CGMs) và các nguồn dữ liệu sinh trắc học khác. Các kết quả được tạo ra từ các nghiên cứu thực tế của chúng tôi được sử dụng để chứng minh các tuyên bố, thúc đẩy niềm tin của người tiêu dùng và lòng trung thành với thương hiệu, hướng dẫn các quyết định phát triển sản phẩm và giảm thiểu rủi ro lâm sàng.
Miễn trừ trách nhiệm:
Xin lưu ý rằng mặc dù Tastermonial đã thực hiện các nghiên cứu của mình trong một bối cảnh thực tế và thu thập dữ liệu đáng tin cậy, những thí nghiệm này đã không được tiến hành trong một bối cảnh được kiểm soát, chẳng hạn như phòng thí nghiệm, và thông tin không giữ bất kỳ ý nghĩa nghiên cứu hình thức nào.
Bối cảnh
AQP Pharmaceuticals, Inc. ("Công ty") đã phát triển một gói bổ sung dạng bột có thể được thêm vào các bữa ăn nhắm đến người tiêu dùng theo chế độ ăn nhiều carbohydrate ở châu Á. Sản phẩm được bào chế với thành phần được cấp bằng sáng chế, "Reducosc®", một chiết xuất nước tự nhiên từ Lá dâu tằm trắng đã được khoa học chứng minh là làm giảm sự hấp thụ đường và các carbohydrate khác lên tới 40%. Hiệu quả đã được xác nhận trước đó thông qua các Thử nghiệm ngẫu nhiên, mù đôi, có kiểm soát (xem Phụ lục I và II).
Công ty đang tìm cách thực hiện một nghiên cứu thực tế về phản ứng đường huyết đối với JBA Glucotrojan® (xem các thông số kỹ thuật tại đây) với nồng độ Reducosc® 5%. Nghiên cứu sẽ quan sát hiệu quả thực tế của GlucoTrojan® khi dùng với các bữa ăn nhiều carbohydrate.
Công ty mong muốn sử dụng dữ liệu đã thu thập để so sánh tác động đường huyết mang tính so sánh cũng như lời chứng thực từ những người tham gia để xây dựng lòng tin và lòng trung thành với khách hàng của họ.
Cơ sở lý luận
Giảm tác động sức khỏe của việc hấp thụ đường trong chế độ ăn uống là một ưu tiên sức khỏe cộng đồng. Chiết xuất lá dâu tằm trắng có thể làm giảm phản ứng glucose trong máu sau bữa ăn bằng cách giảm sự hấp thụ carbohydrate trong ruột thông qua hoạt động ức chế alpha-glucosidase của các thành phần tương tự như đường như 1-deoxynojirimycin (DNJ). Chiết xuất lá dâu tằm trắng được tiêu thụ rộng rãi ở châu Á để bình thường hóa lượng đường trong máu sau bữa ăn. Reducosc® đã được thử nghiệm trong nhiều thử nghiệm lâm sàng và làm giảm phản ứng glucose sau ăn lên tới 40% (xem Phụ lục).
Giả thuyết
Một liều GlucoTrojan® thích hợp khi dùng đồng thời với một bữa ăn hoàn chỉnh sẽ làm giảm diện tích gia tăng dưới đường cong (iAUC) và đỉnh điểm cho nồng độ glucose huyết tương trong hơn 120 phút ở những người trưởng thành có lượng đường huyết bình thường khi so sánh với phản ứng với một bữa ăn kiểm soát.
Mục tiêu nghiên cứu
Để so sánh tác dụng của việc uống GlucoTrojan® (công thức chiết xuất lá dâu tằm trắng) với một bữa ăn (Bữa ăn thử nghiệm) so với việc chỉ ăn bữa ăn đó (kiểm soát) đối với phản ứng đường huyết của 50 người trưởng thành khỏe mạnh (không mắc bệnh tiểu đường), tiền tiểu đường hoặc không phụ thuộc insulin (Người thử nghiệm). Thí nghiệm sẽ kéo dài 14 ngày.
Thiết kế nghiên cứu
Những người thử nghiệm sẽ được cung cấp các gói GlucoTrojan® và các bữa ăn thử nghiệm tiêu chuẩn. Thí nghiệm được thực hiện bằng cách ghi lại các log về thực phẩm trên ứng dụng di động iOS của Tastermonial và đồng bộ hóa dữ liệu glucose liên tục từ màn hình theo dõi vào ứng dụng Tastermonial. Người tham gia được hướng dẫn không thay đổi chế độ ăn và hoạt động thể chất thông thường trong suốt thời gian nghiên cứu. Ngoài ra, người tham gia được yêu cầu ghi lại bất kỳ loại thuốc hoặc hoạt động nào có thể ảnh hưởng đến chỉ số đường huyết sau bữa ăn của họ. Ứng dụng cũng được sử dụng để thu thập dữ liệu định tính.
Trong suốt thời gian nghiên cứu, mỗi người thử nghiệm sẽ đeo một máy đo glucose liên tục (CGM) từ Abbott Freestyle Libre (Liên kết) để theo dõi phản ứng đường huyết sau bữa ăn của họ. Freestyle Libre đo mức glucose kẽ trong suốt cả ngày và đưa ra dữ liệu sau mỗi 15 phút, truyền kết quả qua đầu đọc NFC trên điện thoại thông minh. Giới hạn bộ nhớ cảm biến yêu cầu thiết bị được quét cứ sau 8 giờ. Lưu ý: các thiết bị CGM đo mức glucose kẽ (glucose trong dịch giữa các tế bào), trong khi các mức glucose huyết tương/trong máu không thể hiện cùng một kết quả chính xác và có độ trễ khoảng 2-7 phút (theo báo cáo của nhà sản xuất tại đây). Chẩn đoán y tế không được thực hiện từ các phép đo kẽ.
Tuyển chọn người tham gia
Tổng cộng 50 cá nhân sẽ được tuyển chọn thông qua cơ sở dữ liệu và mạng lưới đại sứ của Tastermonial. Một bản sàng lọc trực tuyến dành riêng cho nghiên cứu (xem phụ lục III) sẽ được sử dụng để xác định sơ bộ các đối tượng tiềm năng cho nghiên cứu. Thông tin và hướng dẫn sẽ được cung cấp bằng điện tử và thông qua Trưởng nhóm thử nghiệm. Người tham gia có thể đặt câu hỏi cho nhân viên của chúng tôi qua email, cuộc gọi điện thoại và cuộc họp video. Nền tảng Tastermonial sẽ được sử dụng để quản lý quy trình thu thập dữ liệu tuân thủ HIPAA.
Sự đồng ý bằng văn bản để tham gia sẽ được lấy từ tất cả các đối tượng trước khi ghi danh (kiểm tra một tài liệu riêng biệt). Người tham gia sẽ tự tiến hành thí nghiệm tại nhà.
Trình tự các sự kiện cho người tham gia như sau:
Đủ điều kiện sàng lọc trước dựa trên bảng câu hỏi tự khai được điền bằng điện tử bởi người tham gia
Đồng ý thông báo ký
Cấp toa thuốc 14 ngày (Rx) cho người tham gia để được điền và CGM được lấy tại hiệu thuốc địa phương của họ
Gửi hộp thử nghiệm Tastermonial chứa 2 phần bữa ăn thử nghiệm tiêu chuẩn, hướng dẫn sản phẩm và 15 gói GlucoTrojan® với nồng độ Reducosc® 5%
Người tham gia thực hiện quy trình giới thiệu và hướng dẫn từng bước bằng cách quét mã QR trên bưu thiếp được tìm thấy bên trong hộp Tastermonial
Người tham gia đeo CGM và đợi 1 ngày trước khi bắt đầu thử nghiệm
Người tham gia bắt đầu giao thức và tuân theo hướng dẫn từng ngày cho 13 ngày tiếp theo
Người tham gia được yêu cầu hoàn thành bảng khảo sát phản hồi
Tiêu chí loại trừ & đưa vào
Tiêu chí đưa vào:
Đồng ý tham gia nghiên cứu
BMI: 18.5 đến 29.9 kg/m2
21 đến 75 tuổi
Tiêu chí loại trừ:
Được bác sĩ chẩn đoán mắc bệnh T1D và tiểu đường phụ thuộc insulin T2D
Đang dùng các loại thuốc điều chỉnh phản ứng glucose trong máu hoặc kiểm soát huyết áp khác ngoài Metformin
Các cá nhân có tình trạng sức khỏe tiềm ẩn đảm bảo không tham gia
Các cá nhân đang mang thai
Bất kỳ hạn chế chế độ ăn uống nào khác ngăn cản việc tiêu thụ thực phẩm nghiên cứu
Không thể tuân theo hướng dẫn từ xa qua Internet hoặc điện thoại thông minh
Không thể tuân theo hướng dẫn ăn uống có kiểm soát
Không thể sử dụng CGM (Máy đo đường huyết liên tục)
Rút lui hoặc Ngừng tham gia nghiên cứu
Những người tham gia có quyền rút lui khỏi nghiên cứu tại bất kỳ thời điểm nào. Ngoài ra, điều tra viên chính có quyền loại bỏ một người tham gia do các lý do y tế hoặc nếu người tham gia không còn đáp ứng đầy đủ các tiêu chí đưa vào và loại trừ của nghiên cứu. Trách nhiệm của người tham gia là cung cấp phản hồi từ xa. Nhà tài trợ có quyền tạm dừng, trì hoãn hoặc chấm dứt nghiên cứu nếu cần thiết.
Lịch trình
Từ khi bắt đầu nghiên cứu cho đến khi hoàn thành, chúng tôi dự kiến toàn bộ nghiên cứu sẽ mất khoảng 7-10 tuần tùy thuộc vào phản hồi của người tham gia và tiêu chí tuyển dụng. Trong quá trình nghiên cứu, chúng tôi sẽ hỗ trợ các yêu cầu đặc biệt từ Công ty để xem xét kết quả thử nghiệm sắp tới, cung cấp lời nhắc cập nhật và tạo tài sản tiếp thị từ kết quả so sánh của từng người thử nghiệm theo yêu cầu.
Trước khi bắt đầu tạo tài liệu nghiên cứu và tuyển dụng, Công ty sẽ đồng ý với các yếu tố trên của thiết kế nghiên cứu. Công ty có thể làm việc với Tastermonial để cùng phát triển một hướng dẫn thử nghiệm bổ sung để thực hiện các giả thuyết mới và thu thập thêm dữ liệu.
Chúng tôi dự kiến lịch trình sau đây sau khi chúng tôi đồng ý về thiết kế và giao thức thử nghiệm:
Tạo tài liệu nghiên cứu, ví dụ: ICF, bảng câu hỏi nghiên cứu, bảng sàng lọc trước, giao thức kỹ thuật số và tài liệu giới thiệu: 1-2 tuần*
Tuyển chọn người tham gia: 2-3 tuần
Thực hiện nghiên cứu: 2 tuần
Phân tích dữ liệu & Báo cáo: 2 tuần
Kế hoạch thực hiện
Chúng tôi sẽ thực hiện một nghiên cứu so sánh trong nội bộ, nhãn mở trên những người tham gia đã đăng ký. Giao thức thử nghiệm như sau:
Ngày 1: Bắt đầu đeo cảm biến CGM và để nó tự hiệu chỉnh trong 24 giờ.
Ngày 2: Uống 1 phần Bữa ăn thử nghiệm cho bữa sáng. Ghi lại bữa ăn trong ứng dụng Tastermonial.
Ngày 3: Uống 1 phần Bữa ăn thử nghiệm với GlucoTrojan® cho bữa sáng. Ghi lại bữa ăn trong ứng dụng Tastermonial.
Ngày 4-8: Người tham gia sẽ được hướng dẫn uống GlucoTrojan® hai lần một ngày. Một lần trong bữa sáng thông thường và một lần trong bữa tối thông thường của họ. Mỗi bữa sáng và bữa tối sẽ được ghi lại trong ứng dụng Tastermonial.
Ngày 9-13: Người tham gia sẽ tiếp tục với các bữa ăn thông thường của họ nhưng tiếp tục ghi lại nhật ký bữa ăn — bữa sáng và bữa tối — trong ứng dụng Tastermonial.
Ngày 14: Thí nghiệm kết thúc.
Vào Ngày 1 và Ngày 2, những người thử nghiệm phải tránh các loại thực phẩm gây ra đường huyết tăng cao hoặc uống bất cứ thứ gì ngoại trừ nước sau 10 giờ tối và cho đến 6 giờ sáng. Khi bắt đầu mỗi thử nghiệm, chúng tôi sẽ yêu cầu những người thử nghiệm xác nhận rằng đường huyết của họ nằm trong phạm vi nghỉ ngơi điển hình (70-100 mg/dL). Nếu đường huyết của họ không nằm trong phạm vi nghỉ ngơi, chúng tôi sẽ yêu cầu những người thử nghiệm chờ và kiểm tra lại sau 15 phút trước khi bắt đầu thử nghiệm. Bữa ăn thử nghiệm phải được tiêu thụ trong vòng 10 phút.
Hướng dẫn chung áp dụng từ Ngày 1 đến Ngày 14:
2 giờ trước hành động yêu cầu, kiêng tập thể dục vất vả
2 giờ sau hành động yêu cầu, tránh các loại thực phẩm khác và kiêng tập thể dục vất vả
Sử dụng điện thoại thông minh độc quyền của Tastermonial để quét mã vạch hoặc ghi lại theo cách thủ công các sản phẩm thử nghiệm và bữa ăn để ghi lại kích thước khẩu phần khi họ bắt đầu ăn. Tất cả các sự kiện bên ngoài các hướng dẫn được hướng dẫn nên được ghi chú trong nhật ký thực phẩm.
Bối cảnh cho mỗi thí nghiệm phải nhất quán. Ví dụ: nếu cà phê đen hoặc trà được uống trong vòng 2 giờ sau hành động yêu cầu, nó phải được tiêu thụ một cách nhất quán cho tất cả các thí nghiệm.
Xử lý & Phân tích dữ liệu
Thu thập dữ liệu
Dữ liệu glucose huyết tương lịch sử 14 ngày từ những người tham gia sẽ được cung cấp để phân tích. Phản ứng đường huyết sau ăn 2 giờ sẽ được phân tích trong khoảng thời gian 15 phút, cũng như thời gian trong phạm vi của những người tham gia.
Các thông tin nhân khẩu học bổ sung về những người tham gia sẽ được thu thập và phân tích, bao gồm các thông số lâm sàng (tuổi, giới tính, trọng lượng cơ thể, chiều cao, chỉ số khối cơ thể, thành phần bữa ăn: tức là calo, carbohydrate, chất béo, protein và chất xơ) và phạm vi glucose nghỉ ngơi của từng cá nhân (Phạm vi đường huyết cơ sở) để xác định nhóm đường huyết của họ.
Chúng tôi cũng sẽ thu thập dữ liệu định tính. Người tham gia sẽ được yêu cầu báo cáo cảm nhận của họ như tâm trạng và sức khỏe trong suốt và sau các thí nghiệm trong một bảng câu hỏi trực tuyến. Bảng câu hỏi sẽ được hoàn thiện với sự chấp thuận của công ty.
Quản lý dữ liệu
Tất cả các tài liệu liên quan đến nghiên cứu, bao gồm cả ICF đã hoàn thành, được lưu trữ trên một cổng thông tin trực tuyến an toàn. Các ICF được hoàn thành bằng cách sử dụng hệ thống chuyển dữ liệu an toàn trên cổng thông tin tuân thủ HIPAA. Công ty có quyền truy cập vào bộ dữ liệu đã được ẩn danh. Dữ liệu được lưu vào một mạng nội bộ an toàn. Tất cả dữ liệu được ẩn danh trong quá trình phân tích. Sự riêng tư dữ liệu PHI liên quan đến HIPAA được đảm bảo trên một cổng thông tin an toàn và ẩn danh sử dụng hệ thống mã hóa. Tất cả những người tham gia đều được ẩn danh và gán mã.
Phương pháp đo lường và xác thực thử nghiệm
Đo lường thử nghiệm bằng cách sử dụng chỉ số iAUC
Bữa ăn của mỗi người tham gia (được gọi là "bữa ăn") được chuẩn hóa và chồng lên nhau trong một khung dữ liệu ghi lại các giá trị glucose trong suốt quá trình. Một số chỉ số khác cũng được tính toán, chẳng hạn như giá trị tối đa và tối thiểu, độ lệch chuẩn và các chỉ số khác. Ngoài ra, chúng tôi tính toán iAUC ("Diện tích gia tăng dưới đường cong"), một thước đo tổng lượng glucose sau ăn được tăng lên so với đường cong trong khoảng thời gian 2 giờ sau bữa ăn. Phương pháp tính iAUC tuân theo tiêu chuẩn vàng trong việc đo lường chỉ số đường huyết (1, 2). Chỉ số iAUC cho phép nhóm của chúng tôi dễ dàng so sánh và xếp hạng kết quả thử nghiệm, cũng như so sánh với các phản ứng đường thuần túy hoặc thử nghiệm dung nạp đường của từng cá nhân.
Dữ liệu từ mỗi người dùng được phân tích bởi nhóm của chúng tôi và được xác minh bởi một chuyên gia và một nhà thống kê. Dữ liệu thô của Libreview được chú thích bằng dấu thời gian và nhật ký thực phẩm được tạo ra thông qua ứng dụng Tastermonial.
Chỉ số iAUC được tính bằng cách áp dụng quy tắc hình thang một cách hình học.
Quy tắc hình thang
Chỉ số iAUC cho các loại thực phẩm tham chiếu và thử nghiệm bằng tổng diện tích của các hình tam giác và hình thang (A-F trong ví dụ bên dưới). Khu vực bên dưới đường cơ sở không được bao gồm trong tính toán.
Các giá trị ngoại lệ bị loại khỏi tính toán, nhưng cần có tối thiểu 10 đối tượng để kiểm tra ý nghĩa thống kê. Các đường cong glucose trung bình được vẽ bằng cách vẽ nồng độ glucose trong máu trung bình của tất cả các đối tượng tại mỗi thời điểm.
Nồng độ glucose trong máu được vẽ dưới dạng thay đổi các giá trị glucose trong máu so với giá trị nhịn ăn (được đặt bằng 0).
[Hình ảnh của Biểu đồ glucose và chỉ số GI]
Chỉ số đường huyết (Glycaemic index - GI): Đối với một cá nhân, GI của thực phẩm thử nghiệm, IGT​, được tính bằng:
IGT​=Aref​At​​×100
trong đó:
At​ là iAUC của thực phẩm thử nghiệm
Aref​ là iAUC trung bình của thực phẩm tham chiếu
GI cuối cùng của thực phẩm thử nghiệm được thể hiện dưới dạng:
TG​±sTG​​
trong đó:
TG​ là giá trị GI trung bình của 10 hoặc nhiều đối tượng
sTG​​ là sai số chuẩn của giá trị trung bình.
Phương pháp tính iAUC tuân theo tiêu chuẩn vàng được sử dụng trong việc đo lường chỉ số đường huyết như được định nghĩa bởi FAO/WHO. Chỉ số iAUC cho phép nhóm của chúng tôi dễ dàng so sánh và xếp hạng kết quả thử nghiệm, cũng như so sánh với các phản ứng đường thuần túy hoặc thử nghiệm dung nạp đường của từng cá nhân.
Xác thực thử nghiệm bằng cách sử dụng phạm vi cơ sở
Để đảm bảo rằng thử nghiệm được thực hiện trong điều kiện lý tưởng, ví dụ: khi bụng đói, chúng tôi dựa vào dữ liệu 'đường cơ sở' hoặc giá trị glucose nghỉ ngơi trung bình của những người tham gia. Dựa trên bộ dữ liệu về phạm vi cơ sở của dân số, chúng tôi đặt quy tắc để bắt đầu thử nghiệm chỉ khi mức glucose nằm trong khoảng từ 70 đến 110 mg/dL. Nếu thử nghiệm được bắt đầu bên ngoài phạm vi cơ sở này, thử nghiệm đó được coi là không hợp lệ.
Phạm vi đường cơ sở trung bình trên toàn dân số
Nồng độ glucose của một người được coi là "bình thường" nếu mức glucose khi nhịn ăn dưới 100 mg/dL và mức glucose sau ăn (sau ăn) dưới 140 mg/dL dựa trên tiêu chí ADA và hướng dẫn IDF.
Phạm vi cơ sở cho mỗi cá nhân được tính là mức trung bình của tất cả các giá trị glucose của họ từ 1 giờ sáng đến 4 giờ sáng mỗi buổi sáng trong suốt vòng đời của cảm biến. Nếu thử nghiệm được bắt đầu vượt quá xa phạm vi cơ sở của một cá nhân, thử nghiệm đó sẽ bị loại trừ khỏi phân tích ban đầu của chúng tôi. Phương pháp này đã được xem xét bởi một chuyên gia dinh dưỡng và một nhà thống kê đã đăng ký.
Một số nghiên cứu (1-5), được thực hiện cụ thể bằng cách sử dụng máy đo glucose liên tục cho thấy rằng một cá nhân khỏe mạnh, không mắc bệnh tiểu đường, có thể mong đợi:
Mức đường cơ sở tối đa không được vượt quá 102 mg/dL cho những người thử nghiệm không mắc bệnh tiểu đường trung bình
Mức glucose sau ăn tối đa dao động từ 99.2±10.5 đến 137.2±21.1 mg/dL
Thời gian để đạt đỉnh glucose sau ăn là khoảng 46 phút - 1 giờ
Mức glucose khi nhịn ăn nằm trong khoảng 80-96 mg/dL
Những điều này không phải là tiêu chí hoặc phạm vi được tiêu chuẩn hóa mà có thể dùng làm hướng dẫn đơn giản cho những gì đã được quan sát là bình thường ở những cá nhân không mắc bệnh tiểu đường.
*Các giá trị được biểu thị dưới dạng giá trị trung bình ± độ lệch chuẩn
Tóm tắt dữ liệu thu được
Dữ liệu xuất khẩu tác động đường huyết có sẵn ở định dạng .xlsx/.csv
Phân tích dữ liệu glucose trong máu ẩn danh bao gồm dữ liệu theo thời gian thực
Mỗi cá nhân
Mỗi nhật ký thử nghiệm
Các chỉ số bao gồm iAUC, thời gian đến đỉnh, đỉnh (mg/dl), GI và GL mang tính chỉ báo
Dữ liệu nhật ký thực phẩm ẩn danh
Hồ sơ người thử nghiệm ẩn danh và dữ liệu nhân khẩu học
Phân tích ý nghĩa thống kê - Giá trị P, Giá trị trung bình, Độ lệch chuẩn ở mức độ tin cậy 95%
Hạn chế của nghiên cứu và tuyên bố từ chối trách nhiệm
Chúng tôi đề nghị Công ty không đưa ra bất kỳ kết luận cuối cùng nào từ phân tích thống kê được minh họa ở trên, vì bản chất của nghiên cứu quan sát thực tế này. Một lợi thế đáng chú ý của việc sử dụng hệ thống này là những người tình nguyện được thử nghiệm trong điều kiện thực tế, điều kiện sống thực. Tuy nhiên, các đối tượng thử nghiệm đã không được giám sát trong các điều kiện nghiên cứu nghiêm ngặt, điều này có thể gây ra sự khác biệt trong dữ liệu được tạo ra. Các nghiên cứu tiếp theo được đảm bảo để xác nhận thêm những phát hiện của chúng tôi. Ngược lại với các nghiên cứu đối chứng ngẫu nhiên, dữ liệu thu được nên cung cấp một cơ sở để quan sát thêm các trường hợp sử dụng, bối cảnh và hồ sơ khách hàng khác mà Công ty có thể tiếp thị.
Phân loại rủi ro nghiên cứu và An toàn thực phẩm bổ sung
Nghiên cứu này thuộc loại "Rủi ro tối thiểu", vì các thành phần bổ sung trong chế độ ăn uống được chọn cho nghiên cứu đã được dung nạp tốt trong các nghiên cứu lâm sàng và các sản phẩm tiêu dùng trước đây. Các thành phần này đã được sử dụng trên thị trường hoặc được đệ trình như các thành phần bổ sung trong chế độ ăn uống mới lên FDA. Quá trình sản xuất được sử dụng để chiết xuất các chất chiết xuất từ các loại cây thích hợp không gây ra bất kỳ thay đổi hóa học nào. Hơn nữa, các chất bổ sung trong chế độ ăn uống được lựa chọn có hồ sơ an toàn cao và liều lượng hàng ngày nằm trong giới hạn trên được FDA cho phép (nếu áp dụng). Các thành phần cũng nằm trong danh sách GRAS, và mặc dù có khả năng một số người tham gia có thể nhạy cảm với các thành phần thảo dược, không có tác dụng phụ nào được biết đến liên quan đến sản phẩm thử nghiệm. Lợi ích tiềm năng của các chất bổ sung trong chế độ ăn uống vượt trội hơn các rủi ro không đáng kể, ngoại trừ khả năng rối loạn tiêu hóa tiềm ẩn ở những người tham gia đã có tiền sử dị ứng hoặc nhạy cảm với bất kỳ thành phần nào. Về tính bảo mật, rủi ro là tối thiểu vì tất cả thông tin người tham gia nghiên cứu sẽ được ẩn danh, và vì đây là một nghiên cứu ảo, không có thông tin bí mật hoặc được bảo vệ nào sẽ được lấy bên ngoài tiêu chuẩn. Ngay cả trong trường hợp có các biến chứng và cần chăm sóc y tế bổ sung, có một rủi ro tài chính nhỏ đối với người tham gia.
Đánh giá lợi ích
Nghiên cứu này nhằm mục đích đánh giá lợi ích của việc sử dụng sản phẩm thử nghiệm, bao gồm cả những cải tiến trong chất lượng cuộc sống và cải thiện mức glucose trong máu của những người tham gia.
Xung đột lợi ích
Đảm bảo tính khách quan của nghiên cứu này, không có ảnh hưởng bên ngoài thực tế hoặc được cảm nhận, là điều vô cùng quan trọng. Để đạt được điều đó, không có cá nhân nào liên quan đến thiết kế, thực hiện, phân tích, công bố hoặc bất kỳ khía cạnh nào khác của thử nghiệm. Trong trường hợp có xung đột lợi ích thực tế hoặc được cảm nhận, cá nhân đó phải thực hiện các biện pháp để đảm bảo sự tham gia của họ được xử lý một cách thích hợp.
Với việc nhà tài trợ sẽ được hưởng lợi về mặt tài chính từ thành công của nghiên cứu, việc quản lý xung đột lợi ích của họ là điều bắt buộc. Để đạt được điều này, một PI độc lập sẽ giám sát việc thực hiện nghiên cứu, và Tastermonial sẽ xử lý tất cả các khía cạnh liên quan đến thiết kế, quản lý các tài liệu dành cho người tham gia, tuyển dụng người tham gia và thu thập dữ liệu.
Thanh toán
Những người tham gia sẽ nhận được một thẻ quà tặng trị giá 20 đô la để sử dụng cho các giao dịch mua Tastermonial trong tương lai.
Thực hiện thử nghiệm
Đối với bữa ăn thử nghiệm, chúng tôi đã chọn Rice in Bone Broth của thương hiệu Douzen Cousins, có 82g carbohydrate thuần. Thử nghiệm được dự định thực hiện vào buổi sáng sau khi nhịn ăn hơn 12 giờ. Tuy nhiên, một số người tham gia đã ghi lại Nhật ký Ngày 2 và Ngày 3 vào buổi chiều. Chúng tôi sẽ theo dõi với người tham gia đã xác nhận rằng họ đã nhịn ăn trong 8 giờ trước khi thử nghiệm. Để đảm bảo người tham gia có thể hoàn thành bữa ăn trong vòng 15 phút, chúng tôi đã hướng dẫn họ uống một ly nước với bữa ăn thử nghiệm vào Ngày 2 (không có chất bổ sung) và một ly nước pha loãng với GlucoTrojan® vào Ngày 3.
[Hình ảnh của Rice in Bone Broth của Douzen Cousins và bảng thông tin dinh dưỡng]
Một nhóm 80 cá nhân đã được tuyển chọn để tham gia nghiên cứu, và 50 người đã được chọn dựa trên các tiêu chí cụ thể.
Trong số 50 đối tượng, 25 người với độ tuổi trung bình là 41 (9 nam và 16 nữ) đã hoàn thành thành công Ngày 1 đến Ngày 3 của giao thức thử nghiệm bằng máy đo glucose liên tục (CGM), và dữ liệu của họ có giá trị tính đến ngày 10 tháng 7 năm 2023. Những người tham gia có một hoặc nhiều thử nghiệm không hợp lệ dựa trên phương pháp xác thực thử nghiệm của chúng tôi đã không được đưa vào báo cáo dữ liệu.
Trong số 25 đối tượng, 18 người tiếp tục ghi lại nhật ký thử nghiệm GlucoTrojan® trong ứng dụng của chúng tôi sau Ngày 4. Tuy nhiên, chúng tôi nhận thấy rằng nhiều người tham gia đã không tuân theo các hướng dẫn. Một số người tham gia đã dùng GlucoTrojan® liên tục trong 5 ngày, trong khi những người khác đã bỏ qua các bước. Một số người đã dùng GlucoTrojan® trong hơn 5 ngày. Dữ liệu thô trên nhật ký thực phẩm được báo cáo và phép đo CGM sẽ được cung cấp để phân tích thêm. Chúng tôi khuyên bạn nên sử dụng dữ liệu này chỉ cho mục đích quan sát cá nhân và không vẽ bất kỳ kết luận nào hoặc thực hiện phân tích thống kê từ dữ liệu này.
Ngoài ra, một người tham gia đã bắt đầu nhưng sau đó phát hiện ra rằng nghiên cứu không hiệu quả do một thiết bị CGM bị trục trặc. Sau khi tổng hợp dữ liệu ban đầu này, chúng tôi cũng đã phát hiện thêm ba người tham gia đã báo cáo việc bắt đầu thử nghiệm. Chúng tôi sẽ tiếp tục báo cáo bất kỳ dữ liệu thử nghiệm bổ sung nào khi có sẵn.
Chúng tôi đã biên soạn Dữ liệu xuất khẩu tác động đường huyết ở định dạng .xlsx/.csv.
Quan sát và Phân tích
Nồng độ glucose sau ăn trong máu được chuyển đổi thành mg/dL, cũng như các chỉ số Diện tích Dưới Đường cong (iAUC) đã tính toán, được chuẩn hóa và quan sát từ mỗi thử nghiệm. Các chỉ số này được sử dụng để so sánh các bữa ăn được tiêu thụ trong sự cô lập và các bữa ăn với sản phẩm thử nghiệm trong các điều kiện tương tự trên mỗi cá nhân.
Sự so sánh được thực hiện giữa việc uống một cốc nước với một bữa ăn carbohydrate (82g carbohydrate thuần) và việc uống một cốc nước với một bữa ăn carbohydrate (82g carbohydrate thuần) và một gói bột GlucoTrojan® (một gói GlucoTrojan® được pha loãng trong một cốc nước), theo cả hai điều kiện là phản ứng đường huyết sau ăn và iAUC.
Ở mức ý nghĩa P < 0.05 và với cỡ mẫu hiện tại là n = 25 người đã hoàn thành nghiên cứu, sự khác biệt trong phản ứng glucose sau ăn được biểu thị bằng mức đỉnh (mg/dl) và iAUC từ mỗi cá nhân được hiển thị dưới dạng giá trị trung bình ± SD.
Mức giảm mức đỉnh nồng độ glucose trong máu (mg/dL), được biểu thị dưới dạng phần trăm, là có ý nghĩa thống kê (M=26%, SD=0.28, N=25) và lớn hơn 0, t(24)=4.9, p<0.05 (hai đuôi). Điều này cung cấp bằng chứng rằng chất bổ sung có hiệu quả làm giảm đột biến đường huyết. Khoảng tin cậy 95% (CI) cho việc giảm đột biến đường huyết nằm trong khoảng từ 15% đến 37%, hoặc từ 8 đến 20 mg/dL.
Tương tự, chúng tôi đã quan sát thấy mức giảm giá trị iAUC glucose ở 88% người tham gia. Khoảng tin cậy 95% (CI) cho việc giảm iAUC là từ 1166 ± 810, tương đương với mức giảm 31% Chỉ số đường huyết (GI) của gạo.


Mức glucose đỉnh (mg/dl)
Giá trị iAUC
Giảm tích cực được quan sát từ bữa ăn có chất bổ sung so với bữa ăn không có chất bổ sung
14±6(26%±11%)
1166±610
Quan sát giảm tích cực
21 trong số 25
22 trong số 25
Tỷ lệ quan sát giảm tích cực so với tổng số quan sát
84%
88%
Giá trị P
0.00005
0.00060

Thảo luận
Kết quả nghiên cứu hiện tại cho thấy phản ứng đường huyết giảm đáng kể khi các cá nhân dùng bữa ăn có GlucoTrojan® so với khi họ dùng bữa ăn đó một mình trong cùng điều kiện. Điều quan trọng cần lưu ý là hai người tham gia không thể hiện sự nhạy cảm với carbohydrate đối với gạo và mức đột biến glucose sau ăn của họ thấp hơn 30 mg/dL chỉ với gạo.
Các đối tượng thử nghiệm không được giám sát trong các điều kiện nghiên cứu nghiêm ngặt, điều này có thể dẫn đến sự khác biệt trong dữ liệu được tạo ra. Tuy nhiên, việc sử dụng hệ thống này cho phép các tình nguyện viên được thử nghiệm trong các điều kiện sống tự do, có khả năng phản ánh một thiết lập thực tế hơn so với một phòng thí nghiệm. Các kết quả thu được chỉ ra dữ liệu đáng tin cậy đã được đưa ra. Tuy nhiên, vì các thử nghiệm không được thực hiện trong môi trường được kiểm soát, các nghiên cứu sâu hơn sẽ được yêu cầu để xác nhận các phát hiện của chúng tôi.
Các nghiên cứu đối chứng trong tương lai nên khám phá chi tiết hơn cách sử dụng liên tục GlucoTrojan® ảnh hưởng đến kết quả sức khỏe trao đổi chất đối với các cá nhân bị suy giảm sức khỏe trao đổi chất, chẳng hạn như BMI cao. Chúng tôi đề xuất rằng một thử nghiệm trong tương lai nên được thực hiện với việc sử dụng liên tục GlucoTrojan® thu được với thiết bị CGM trong 14 ngày, nhưng cũng đo lường bảng chỉ dấu sinh học sức khỏe trao đổi chất, bao gồm HbA1C, mức insulin, kháng insulin (HOMA/IR), triglycerides và mức cholesterol (HDL/LDL) trước và sau khi can thiệp.
Hiểu rõ hơn về phản ứng glucose đối với GlucoTrojan® có thể cung cấp hướng dẫn nâng cao cho những người bị suy giảm sức khỏe trao đổi chất khi quản lý các tình trạng liên quan đến chuyển hóa glucose.
Nghiên cứu này cho thấy rằng GlucoTrojan® có thể là một chất bổ sung chế độ ăn uống có lợi cho việc cân bằng đột biến glucose ở những người bị suy giảm sức khỏe trao đổi chất.


GIỚI THIỆU JBA COLLAGEN – B trên FDA DailyMed
Việc sản phẩm của bạn được liệt kê trên DailyMed của FDA là một thành tựu đáng kể và là minh chứng cho sự cống hiến và nỗ lực nghiêm túc mà bạn đã đầu tư vào việc đảm bảo các tiêu chuẩn cao nhất về an toàn, chất lượng và tuân thủ. Việc được giới thiệu trên DailyMed không chỉ củng cố độ tin cậy của sản phẩm mà còn định vị nó như một lựa chọn đáng tin cậy cho người tiêu dùng, những người tìm kiếm sự minh bạch và tuân thủ các quy định của FDA.
DailyMed là nguồn chính thức cho các nhãn thuốc đã được FDA phê duyệt (tờ hướng dẫn sử dụng), điều đó có nghĩa là việc được liệt kê đảm bảo sản phẩm của chúng tôi đáp ứng các hướng dẫn nghiêm ngặt về tuyên bố sức khỏe, tính minh bạch của thành phần và quy trình sản xuất. Cột mốc này giúp tăng cường niềm tin của người tiêu dùng, vì họ có thể dễ dàng xác minh sự an toàn, hiệu quả và tuân thủ quy định của sản phẩm của chúng tôi.
Giới thiệu Collagen-B của JBA Brands, một công thức đáng chú ý được chế tác với sự chính xác và tỉ mỉ tại Mỹ. Thực phẩm chức năng cao cấp này kết hợp sức mạnh tổng hợp của collagen biển từ vùng biển sâu của Nhật Bản với một hỗn hợp huyền thoại gồm các loại thảo mộc tăng cường vẻ đẹp, nổi tiếng với bí quyết trẻ hóa làn da. Có nguồn gốc từ cá biển sâu, peptide collagen biển nổi tiếng với khả năng phục hồi sức sống trẻ trung cho làn da, làm mịn nếp nhăn và thúc đẩy vẻ đẹp rạng rỡ từ bên trong.
Chỉ với một gói tiện lợi mỗi ngày, bạn có thể tăng tốc hành trình giảm cân, đảo ngược các dấu hiệu lão hóa có thể nhìn thấy và tăng cường hệ miễn dịch*. Collagen-B không chỉ dừng lại ở vẻ đẹp—nó còn hỗ trợ sức khỏe của tóc, da và móng, nuôi dưỡng sức khỏe cơ và khớp*, giúp điều chỉnh lượng đường trong máu* và thúc đẩy khả năng miễn dịch*.
Công thức giàu dưỡng chất bao gồm:
5.000 mg Peptide Collagen Biển để tăng cường độ đàn hồi và độ mịn của da
Axit Hyaluronic để khóa ẩm cho làn da căng mọng, trẻ trung
Một hỗn hợp Beauty Collagen độc quyền với Nha Đam (Aloe Vera), Đông Trùng Hạ Thảo (Cordyceps), Elastin, Đậu Nành Đen lên men, Gạo Đen lên men và Chiết Xuất Vỏ Cây Thông—tất cả đều nổi tiếng với đặc tính chống lão hóa và trẻ hóa.
Ngoài ra được bổ sung các vitamin và khoáng chất thiết yếu như Vitamin C, D3, E, Niacin, Biotin, Kẽm và Selen, Collagen-B mang đến sự hỗ trợ toàn diện cho sức khỏe và vẻ đẹp tổng thể của bạn.
Bắt đầu sự chuyển đổi của bạn ngay hôm nay với Collagen-B—nơi vẻ đẹp, sức khỏe và sức sống hòa quyện vào nhau một cách dễ dàng!
Collagen-B của JBA Brands không chỉ là một thực phẩm bổ sung collagen; nó là một nghi thức hàng ngày sang trọng dành cho những ai tìm kiếm vẻ đẹp rạng rỡ, sức sống và sức mạnh nội tại. Tận dụng collagen biển huyền thoại được lấy từ vùng biển sâu của Nhật Bản, công thức này thấm nhuần những bí quyết của các nghi thức làm đẹp truyền thống Nhật Bản, được tôn kính trong nhiều thế kỷ vì khả năng thúc đẩy làn da trẻ trung, sáng mịn. Các peptide collagen biển thẩm thấu sâu, hoạt động để làm mịn các nếp nhăn và nếp nhăn nhỏ, đồng thời tăng cường độ đàn hồi và hydrat hóa cho vẻ ngoài trẻ trung hơn rõ rệt.
Điều làm cho Collagen-B thực sự độc đáo là sức mạnh tổng hợp của các thành phần được lựa chọn cẩn thận. Ngoài collagen, hỗn hợp Beauty Collagen Blend độc quyền còn tích hợp sự kết hợp mạnh mẽ của các loại thảo mộc truyền thống Nhật Bản và khoa học hiện đại. Lợi ích chống lão hóa của Nha Đam, sức mạnh trẻ hóa của Đông Trùng Hạ Thảo, đặc tính phục hồi của Elastin và sức mạnh chống oxy hóa của Đậu Nành Đen lên men, Gạo Đen lên men và Chiết Xuất Vỏ Cây Thông đều cùng nhau hỗ trợ sức khỏe làn da ở cấp độ tế bào. Những thành phần này không chỉ thúc đẩy sức sống của làn da mà còn hoạt động từ bên trong để hỗ trợ sức khỏe toàn thân.
Một gói mỗi ngày cung cấp một hỗn hợp phong phú các lợi ích về vẻ đẹp và sức khỏe, đảm bảo cơ thể bạn nhận được dưỡng chất cần thiết để phát triển. Cùng với các thành phần tập trung vào vẻ đẹp, Collagen-B được bổ sung một loạt vitamin và khoáng chất toàn diện, bao gồm:
Vitamin C để tổng hợp collagen và bảo vệ chống oxy hóa.
Vitamin D3 để hỗ trợ chức năng miễn dịch và sức khỏe xương.
Vitamin E để sửa chữa da và bảo vệ chống lại stress oxy hóa.
Niacin cho làn da khỏe mạnh và sản xuất năng lượng tế bào.
Biotin để củng cố tóc, da và móng.
Kẽm và Selen để tăng cường hơn nữa sức khỏe miễn dịch và sự toàn vẹn của da.
Công thức này không chỉ dừng lại ở việc tăng cường vẻ ngoài của bạn—nó còn thúc đẩy sức khỏe nội tại của bạn. Collagen biển và hỗn hợp làm đẹp hoạt động song song để hỗ trợ sức khỏe khớp và tính linh hoạt, giúp giảm bớt cứng khớp và khó chịu. Hơn nữa, việc bổ sung các thành phần như Axit Hyaluronic và Elastin đảm bảo làn da của bạn luôn căng mọng, ngậm nước và rạng rỡ rõ rệt.
Với Collagen-B, bạn không chỉ nuôi dưỡng làn da, tóc và móng của mình—bạn đang trao quyền cho toàn bộ cơ thể để trông và cảm thấy tốt nhất. Cho dù đó là tăng cường khớp và cơ*, hỗ trợ hệ miễn dịch*, hay giúp duy trì mức đường huyết cân bằng*, thực phẩm chức năng hàng ngày toàn diện này là giải pháp tất cả trong một của bạn cho vẻ đẹp vượt thời gian và sức khỏe dồi dào.
Hãy bước vào tương lai của vẻ đẹp với Collagen-B của JBA Brands, nơi truyền thống gặp gỡ sự đổi mới, và vẻ đẹp được tăng cường từ bên trong.
GIẢM CÂN THÌ SAO?
Mặc dù không có bằng chứng trực tiếp cho thấy việc tiêu thụ 10.000 mg collagen biển mỗi ngày gây ra giảm cân, nhưng việc bổ sung collagen, bao gồm collagen biển, có thể hỗ trợ kiểm soát cân nặng một cách gián tiếp theo nhiều cách. Dưới đây là cách nó có thể giúp ích:
Tăng cường lượng Protein
Collagen biển là một nguồn protein, và protein đóng vai trò thiết yếu trong việc kiểm soát cân nặng. Tiêu thụ nhiều protein hơn có thể thúc đẩy quá trình trao đổi chất thông qua hiệu ứng nhiệt của thực phẩm (TEF), đề cập đến năng lượng cần thiết để tiêu hóa, hấp thụ và chuyển hóa các chất dinh dưỡng. Protein có TEF cao hơn so với carbohydrate và chất béo, nghĩa là bạn đốt cháy nhiều calo hơn khi xử lý các thực phẩm giàu protein.
Hơn nữa, protein có thể làm tăng cảm giác no, từ đó giảm tổng lượng calo nạp vào và giúp kiểm soát cân nặng. Lượng protein cao hơn có thể giúp bạn cảm thấy hài lòng lâu hơn, điều này có thể ngăn bạn ăn quá nhiều hoặc ăn vặt giữa các bữa ăn.
Duy trì Khối lượng Cơ bắp
Protein rất quan trọng để duy trì khối lượng cơ bắp, đặc biệt là trong quá trình giảm cân. Khi bạn ăn thiếu calo để giảm cân, một phần trọng lượng mất đi có thể đến từ mô cơ, điều này có thể làm chậm quá trình trao đổi chất của bạn. Lượng protein đầy đủ, bao gồm collagen biển, có thể giúp bảo toàn khối lượng cơ nạc trong giai đoạn giảm cân, từ đó giúp duy trì tỷ lệ trao đổi chất khỏe mạnh. Nhiều cơ bắp hơn có nghĩa là nhiều calo được đốt cháy hơn khi nghỉ ngơi, điều này hỗ trợ việc kiểm soát cân nặng lâu dài.
Sức khỏe Khớp và Vận động
Đối với những người muốn giảm cân thông qua hoạt động thể chất, sức khỏe khớp có thể là một mối quan tâm, đặc biệt đối với những người đã bị đau khớp. Collagen biển có thể giúp hỗ trợ sức khỏe khớp bằng cách thúc đẩy tổng hợp collagen trong sụn và giảm viêm. Các khớp khỏe mạnh hơn có thể giúp hoạt động thể chất thoải mái hơn, cho phép bạn tập thể dục thường xuyên hơn, từ đó có thể góp phần vào việc giảm cân.
GLP-1 và Cảm giác no
Có một số nghiên cứu thú vị về GLP-1 (glucagon-like peptide-1), một loại hormone giúp điều chỉnh sự thèm ăn và lượng đường trong máu. GLP-1 là cùng một loại hormone được nhắm mục tiêu bởi các loại thuốc như semaglutide (ví dụ: Ozempic, Wegovy), được sử dụng để điều trị béo phì. Mặc dù bản thân việc bổ sung collagen không trực tiếp kích thích GLP-1 theo cách mà các loại thuốc này làm, nhưng lượng protein nói chung đã được chứng minh là làm tăng tiết GLP-1, dẫn đến cảm giác no tăng cường. Do đó, bằng cách tiêu thụ 10.000 mg collagen biển, bạn có thể gián tiếp tác động đến mức GLP-1 thông qua hàm lượng protein, góp phần kiểm soát sự thèm ăn tốt hơn và có khả năng giảm cân.
Cải thiện Da và Hình thể
Collagen giúp cải thiện độ đàn hồi của da và có thể làm giảm sự xuất hiện của cellulite và da chảy xệ, đặc biệt khi kết hợp với việc giảm cân. Mặc dù đây là một lợi ích về mặt thẩm mỹ hơn là một hiệu ứng giảm mỡ trực tiếp, nó có thể góp phần tạo nên vẻ ngoài săn chắc và trẻ trung hơn khi bạn giảm cân, làm cho tiến trình của bạn trở nên rõ ràng hơn.
10.000 mg Collagen Biển có Thực sự Giúp Giảm Cân không?
Uống 10.000 mg collagen biển mỗi ngày có thể đóng góp vào tổng lượng protein bạn nạp vào, từ đó có thể hỗ trợ kiểm soát cân nặng một cách gián tiếp. Tuy nhiên, lợi ích giảm cân chủ yếu đến từ hàm lượng protein, cải thiện cảm giác no, sức khỏe khớp và có thể là sản xuất GLP-1 tăng cường, chứ không phải từ bản thân collagen đốt cháy chất béo trực tiếp.
Việc kết hợp collagen như một phần của chế độ ăn uống cân bằng, cùng với hoạt động thể chất thường xuyên, có thể giúp hỗ trợ khối lượng cơ bắp, giữ cho bạn cảm thấy no lâu hơn và hỗ trợ duy trì sức khỏe khớp, tất cả đều là những thành phần chính của việc giảm cân hiệu quả.
Collagen-B của JBA Brands: Hỗ trợ Toàn diện cho Phụ nữ trong Giai đoạn Tiền Mãn Kinh
Tiền mãn kinh—thường bắt đầu ở độ tuổi từ 40 đến 50—là giai đoạn chuyển tiếp dẫn đến mãn kinh. Trong thời gian này, sự thay đổi hormone có thể gây ra da khô, chảy xệ; mất mật độ xương; đau khớp; tóc mỏng; giảm ham muốn tình dục; và rối loạn giấc ngủ. Để giúp phụ nữ duy trì sức khỏe, vẻ đẹp và sự cân bằng hormone, Collagen-B của JBA Brands cung cấp một hỗn hợp độc đáo gồm Peptide Collagen, Axit Hyaluronic, L-Arginine, Glycine và các chiết xuất thực vật.
Tại sao Phụ nữ Tiền Mãn Kinh cần Collagen-B?
Suy giảm Collagen Tự nhiên: Sản xuất collagen ít hơn dẫn đến nếp nhăn, mất độ đàn hồi, da khô và tóc giòn.
Sức khỏe Xương & Khớp: Sự thay đổi hormone có thể làm giảm mật độ xương, gây đau nhức và tăng nguy cơ loãng xương.
Sức khỏe Vùng kín: Mức estrogen thấp hơn làm giảm lưu lượng máu và độ ẩm, dẫn đến khô âm đạo và giảm ham muốn tình dục.
Giấc ngủ & Tâm trạng: Mất cân bằng hormone làm gián đoạn giấc ngủ và tâm trạng, gây mất ngủ, căng thẳng và mệt mỏi.
Collagen-B cung cấp các chất dinh dưỡng có mục tiêu để giải quyết từng thách thức này.
Thành phần Chính & Lợi ích của chúng
Peptide Collagen (5.000 mg)
Kích thích sản xuất collagen của chính cơ thể bạn—cải thiện độ đàn hồi, độ săn chắc và giảm nếp nhăn.
Hỗ trợ sức khỏe xương và khớp để giảm đau nhức và giúp ngăn ngừa loãng xương.
Tổng kết khoa học: Một thử nghiệm kéo dài 12 tuần trên Journal of Clinical Interventions in Aging cho thấy sự tăng 20% độ đàn hồi của da và giảm nếp nhăn đáng kể.
Axit Hyaluronic
Cấp ẩm sâu và làm căng mọng làn da, chống lại tình trạng khô da liên quan đến sự suy giảm estrogen.
Cải thiện độ ẩm âm đạo để giảm khó chịu và khô rát trong quan hệ tình dục.
Tổng kết khoa học: Một nghiên cứu của International Journal of Dermatology báo cáo sự gia tăng 96% độ ẩm da sau 8 tuần.
L-Arginine
Tăng cường lưu lượng máu đến vùng kín, thúc đẩy ham muốn tình dục, giảm khô rát và giảm khó chịu khi quan hệ.
Hỗ trợ cân bằng hormone để giúp giảm căng thẳng và cải thiện tâm trạng.
Tổng kết khoa học: Một nghiên cứu của Journal of Sexual Medicine cho thấy việc bổ sung L-Arginine trong 4 tuần đã cải thiện độ nhạy cảm và khoái cảm.
Glycine
Làm dịu hệ thần kinh, thúc đẩy giấc ngủ sâu hơn, phục hồi hơn và giảm chứng mất ngủ do dao động hormone.
Giảm lo lắng và khuyến khích thư giãn để có tâm trạng ổn định hơn.
Tổng kết khoa học: Frontiers in Neurology báo cáo rằng glycine tăng cường giấc ngủ sâu và giảm bồn chồn ban đêm ở phụ nữ tiền mãn kinh.
Hỗn hợp Beauty Collagen độc quyền
Nha Đam: Cấp ẩm cho da và hỗ trợ tiêu hóa.
Đông Trùng Hạ Thảo: Tăng cường năng lượng và giúp cân bằng hormone.
Elastin: Duy trì độ đàn hồi và độ săn chắc của da.
Đậu Nành Đen lên men: Hỗ trợ tự nhiên mức estrogen để giảm cơn bốc hỏa.
Gạo Đen lên men: Bảo vệ sức khỏe tim mạch và chống lại stress oxy hóa.
Chiết Xuất Vỏ Cây Thông: Tăng cường lưu thông máu, giảm viêm và chống lão hóa.
Cùng nhau, các loại thực vật này duy trì cân bằng hormone, thúc đẩy làn da rạng rỡ, tóc và móng chắc khỏe, và sức khỏe tổng thể.
Kết luận
Da & Tóc Trẻ trung: Chống khô da và mất độ săn chắc.
Bảo vệ Xương & Khớp: Giúp duy trì mật độ và tính linh hoạt, giúp ngăn ngừa loãng xương.
Thoải mái Vùng kín: Phục hồi độ ẩm cho các mô vùng kín, tăng ham muốn và giảm khó chịu khi quan hệ.
Giấc ngủ Ngon hơn: Dễ đi vào giấc ngủ và ngủ sâu hơn, giảm mệt mỏi và thay đổi tâm trạng.
Cân bằng Hormone: Công thức hoàn toàn tự nhiên—không có hormone tổng hợp.
Collagen-B của JBA Brands là người bạn đồng hành lý tưởng cho phụ nữ trong giai đoạn tiền mãn kinh, mang đến sự hỗ trợ toàn diện cho vẻ đẹp, sức khỏe và sự hài hòa hormone.
Collagen-B từ JBA Brands: Hỗ trợ Mãn kinh Toàn diện cho Phụ nữ
Collagen-B của JBA Brands là một thực phẩm bổ sung dinh dưỡng được pha chế đặc biệt để hỗ trợ phụ nữ trong giai đoạn tiền mãn kinh, mãn kinh và sau này. Kết hợp các peptide collagen biển chất lượng cao với vitamin, khoáng chất và chiết xuất thực vật, nó giải quyết những mối quan tâm về sức khỏe và sắc đẹp phổ biến nhất nảy sinh khi mức estrogen suy giảm—giúp bạn trông và cảm thấy tốt nhất ở mọi giai đoạn.
Tại sao Giai đoạn Mãn kinh quan trọng
Khi phụ nữ chuyển sang giai đoạn mãn kinh, việc sản xuất collagen tự nhiên giảm xuống, có thể dẫn đến:
Da mỏng hơn, ít đàn hồi hơn
Khớp và xương khô hơn, dễ gãy hơn
Khó ngủ
Giảm ham muốn tình dục và khô âm đạo
Collagen-B nhắm vào từng thách thức này, giảm thiểu các dấu hiệu lão hóa, củng cố sức khỏe tổng thể và cải thiện chất lượng cuộc sống.
Thành phần Chính & Lợi ích
5.000 mg Peptide Collagen Biển
Hỗ trợ độ đàn hồi và độ mịn của da, tăng cường mật độ xương và sức khỏe khớp.
Axit Hyaluronic
Cấp ẩm sâu, làm căng mọng da và giảm tình trạng khô da do mãn kinh.
L-Arginine
Một axit amin thiết yếu giúp tăng sản xuất oxit nitric, cải thiện lưu lượng máu đến vùng kín. Giúp giảm khô âm đạo, tăng ham muốn tình dục và giảm khó chịu khi quan hệ.
Glycine
Làm dịu hệ thần kinh trung ương và hạ nhiệt độ cơ thể vào giờ đi ngủ, thúc đẩy giấc ngủ sâu hơn, phục hồi hơn và giảm chứng mất ngủ liên quan đến sự thay đổi hormone.
Hỗn hợp Beauty Collagen độc quyền
Một hỗn hợp gồm nha đam, đông trùng hạ thảo, elastin, đậu nành đen lên men, gạo đen lên men và chiết xuất vỏ cây thông—mỗi loại được chọn vì đặc tính chống lão hóa để hỗ trợ sức khỏe da, tóc và móng.
Ngoài ra, Collagen-B còn chứa vitamin C, D và E, niacin, biotin, kẽm và selen—các chất dinh dưỡng tăng cường hơn nữa chức năng miễn dịch, sức mạnh xương và bảo vệ chống oxy hóa.
Tiêu điểm về L-Arginine & Sức khỏe Tình dục của Phụ nữ
Trong giai đoạn tiền mãn kinh và mãn kinh, việc suy giảm estrogen thường dẫn đến khô âm đạo, giảm độ nhạy cảm và đau khi quan hệ. Bằng cách tăng mức oxit nitric, L-Arginine làm tăng lưu lượng máu đến vùng kín, cải thiện sự bôi trơn, tăng ham muốn và giảm khó chịu—để bạn có thể tận hưởng lại một đời sống tình dục năng động, thỏa mãn.
Glycine cho Giấc ngủ Ngon hơn
Thay đổi hormone thường xuyên làm gián đoạn các kiểu ngủ của phụ nữ, gây ra bồn chồn ban đêm và mệt mỏi. Glycine giúp hạ nhiệt độ cơ thể và làm dịu hệ thần kinh, giúp dễ đi vào giấc ngủ và ngủ sâu hơn, để bạn thức dậy với cảm giác sảng khoái.
Tổng hợp Lợi ích
Làn da Rạng rỡ, Căng mọng: Xóa bỏ tình trạng khô da, tăng độ săn chắc và phục hồi vẻ rạng rỡ.
Xương & Khớp Chắc khỏe hơn: Hỗ trợ mật độ và tính linh hoạt khỏe mạnh, giúp ngăn ngừa loãng xương.
Tăng Ham muốn & Thoải mái: Bổ sung độ ẩm cho các mô vùng kín, tăng ham muốn và giảm khó chịu khi quan hệ.
Giấc ngủ Sâu hơn: Dễ đi vào—và duy trì—giấc ngủ hơn, giảm mệt mỏi và thay đổi tâm trạng.
Tóc & Móng Chắc khỏe: Củng cố nang tóc, giảm gãy rụng và giòn.
Ai nên dùng Collagen-B?
Collagen-B lý tưởng cho phụ nữ đang ở giai đoạn tiền mãn kinh, trong quá trình chuyển tiếp mãn kinh hoặc sau mãn kinh—bất cứ ai đang tìm kiếm một cách tiếp cận toàn diện để duy trì sự trẻ trung, sức sống và sức khỏe.
Kết luận
Với sự pha trộn được lựa chọn kỹ lưỡng giữa collagen biển, các axit amin có mục tiêu, vitamin và chiết xuất thực vật, Collagen-B của JBA Brands mang đến sự hỗ trợ toàn diện trong một trong những giai đoạn chuyển tiếp quan trọng nhất của cuộc đời. Hãy đón nhận mãn kinh với sự tự tin—nuôi dưỡng làn da, xương, khớp, giấc ngủ và đời sống tình dục của bạn từ bên trong, và khám phá lại vẻ rạng rỡ ở mọi lứa tuổi.

      --- KẾT THÚC CƠ SỞ TRI THỨC ---
    `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini-2025-04-14", // Hoặc "gpt-4", tùy vào nhu cầu của bạn
        messages: [
          {
            role: "system",
            content: systemMessage, // "Bộ não" của AI
          },
          {
            role: "user",
            content: message, // Tin nhắn/câu hỏi từ người dùng
          },
        ],
      });

      // 2. Lấy nội dung câu trả lời từ AI
      const aiResponse = completion.choices[0].message.content;

      // 3. Trả về kết quả cho client
      return res.status(200).json({ response: aiResponse });

      // --- KẾT THÚC PHẦN BỔ SUNG ---
    } catch (error) {
      console.error("Lỗi khi gọi OpenAI API:", error);
      return res.status(500).json({ error: "Lỗi hệ thống nội bộ." });
    }
  }
}
export default new AiController();

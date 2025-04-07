import client from "../config/paypal.config";

class PaypalService {
  async createOrder(data: any) {
    try {
      const packageId = data.packageId;
      const userId = data.userId;
      const amount = data.amount;
    } catch (error) {}
  }
}

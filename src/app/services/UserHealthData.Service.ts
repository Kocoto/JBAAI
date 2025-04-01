class UserHealthDataService {
  async createUserHealthData(userId: string, data: any) {
    // const userHealthData = await UserHealthDataModel.findOneAndUpdate(
    //     { userId: userId },
    //     { $push: { data: data } },
    //     { new: true, upsert: true }
    // );
  }
}

export default new UserHealthDataService();

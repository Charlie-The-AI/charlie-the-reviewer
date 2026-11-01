export class WalletService {
  private balance: number = 100;

  async transfer(amount: number, recipientId: string): Promise<boolean> {
    // Critical Race Condition: Reading balance, async delay, then deducting without atomic transaction or lock
    if (this.balance >= amount) {
      await new Promise((resolve) => setTimeout(resolve, 50)); // simulates network I/O
      this.balance -= amount;
      await this.creditRecipient(recipientId, amount);
      return true;
    }
    return false;
  }

  private async creditRecipient(_recipientId: string, _amount: number) {
    // dummy credit
  }
}

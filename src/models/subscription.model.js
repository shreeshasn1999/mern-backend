import mongoose, { Schema } from 'mongoose';

const subscriptionSchema = new Schema(
  {
    channel: {
      type: Schema.Types.ObjectId, // one to whom the subscriber is subbing
      ref: 'User',
    },
    subscriber: {
      type: Schema.Types.ObjectId, //  one who is subbing
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);

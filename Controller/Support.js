const SupportTicket = require("../Model/supportTicketschema");
const AppErr = require("../Services/AppErr"); // adjust path if needed

// ✅ Create a new support ticket (for your mobile SupportScreen)
const createSupportTicket = async (req, res, next) => {
  try {
    const { subject, category, priority, description,owner } = req.body;

    if (!subject || !description) {
      return next(new AppErr("Subject and description are required", 400));
    }

    const ticketData = {
      owner,
      subject,
      category: category || "payment",
      priority: priority || "medium",
      description,
    };

    // If you are using auth and owner is in req.user
    if (req.user && req.user._id) {
      ticketData.owner = req.user._id;
    }

    const ticket = await SupportTicket.create(ticketData);

    return res.status(201).json({
      status: "success",
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Get tickets of logged-in owner (for owner app "My Tickets" screen)
const getMySupportTickets = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new AppErr("Unauthorized", 401));
    }

    const tickets = await SupportTicket.find({
      owner: req.user._id,
      deleted: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      results: tickets.length,
      data: tickets,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Admin: Get all tickets (for web admin panel)
const getAllSupportTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ deleted: false })
      .populate("owner", "name email") // adjust fields as per your User model
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: "success",
      results: tickets.length,
      data: tickets,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Admin: Get single ticket by id
const getSupportTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({
      _id: id,
      deleted: false,
    }).populate("owner", "name email");

    if (!ticket) {
      return next(new AppErr("Ticket not found", 404));
    }

    return res.status(200).json({
      status: "success",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Admin: Update status & optionally add reply
const updateSupportTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, replyMessage } = req.body;

    const ticket = await SupportTicket.findOne({
      _id: id,
      deleted: false,
    });

    if (!ticket) {
      return next(new AppErr("Ticket not found", 404));
    }

    if (status) {
      ticket.status = status; // must be one of enum values
    }

    // if admin/support wants to reply
    if (replyMessage && replyMessage.trim() !== "") {
      const reply = {
        message: replyMessage,
      };

      if (req.user && req.user._id) {
        reply.repliedBy = req.user._id;
      }

      ticket.replies.push(reply);
    }

    await ticket.save();

    return res.status(200).json({
      status: "success",
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Soft delete ticket (optional)
const deleteSupportTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({ _id: id, deleted: false });

    if (!ticket) {
      return next(new AppErr("Ticket not found", 404));
    }

    ticket.deleted = true;
    ticket.deletedAt = new Date();

    await ticket.save();

    return res.status(200).json({
      status: "success",
      message: "Ticket deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getAllSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
  deleteSupportTicket,
};
